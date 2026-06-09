const passport      = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const axios          = require('axios');
const User           = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn OpenID Connect via passport-oauth2
//
// WHY we do NOT use passport-linkedin-oauth2:
//   That package calls GET /v2/me (the old LinkedIn REST API).
//   That endpoint requires the "r_liteprofile" / "r_emailaddress" scopes
//   which are only available under the Marketing Developer Platform product.
//
// "Sign In with LinkedIn using OpenID Connect" only grants:
//   openid, profile, email
// and exposes ONE endpoint for user data:
//   GET https://api.linkedin.com/v2/userinfo   (OIDC standard)
//
// passport-oauth2 is a generic OAuth2 strategy — we point it at LinkedIn's
// OIDC endpoints and manually fetch the userinfo ourselves.
// ─────────────────────────────────────────────────────────────────────────────

const LINKEDIN_AUTH_URL     = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL    = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

passport.use(
  'linkedin',
  new OAuth2Strategy(
    {
      authorizationURL:  LINKEDIN_AUTH_URL,
      tokenURL:          LINKEDIN_TOKEN_URL,
      clientID:          process.env.LINKEDIN_CLIENT_ID,
      clientSecret:      process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL:       process.env.LINKEDIN_CALLBACK_URL,
      scope:             ['openid', 'profile', 'email'],
      state:             false,   // CSRF protection
      passReqToCallback: true,
    },

    // ── Verify callback ──────────────────────────────────────────────────────
    // accessToken is a LinkedIn OIDC access token.
    // We use it to call /v2/userinfo — the only endpoint we are allowed to hit.
    async (req, accessToken, refreshToken, params, done) => {
      try {

        // ── 1. Fetch userinfo from LinkedIn OIDC endpoint ──────────────────
        // This is the standard OIDC userinfo endpoint — no special permissions
        // needed beyond openid + profile + email.
        const { data: profile } = await axios.get(LINKEDIN_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10_000,
        });

        // ── 2. Normalise the OIDC userinfo response ────────────────────────
        // LinkedIn OIDC userinfo returns:
        // {
        //   sub:                 "linkedin_user_id",   ← unique stable ID
        //   name:                "John Doe",
        //   given_name:          "John",
        //   family_name:         "Doe",
        //   picture:             "https://...",
        //   email:               "john@example.com",
        //   email_verified:      true,
        //   locale:              { country: "US", language: "en" }
        // }
        const linkedinId = profile.sub;
        const email      = profile.email?.toLowerCase() || null;
        const name       = profile.name
                           || `${profile.given_name || ''} ${profile.family_name || ''}`.trim()
                           || 'LinkedIn User';
        const avatar     = profile.picture || '';
        const locale     = profile.locale
                           ? `${profile.locale.language}-${profile.locale.country}`
                           : null;

        if (!linkedinId) {
          return done(new Error('LinkedIn did not return a user ID (sub). Check your app scopes.'));
        }

        // ── 3. Case A — Returning user matched by LinkedIn sub ─────────────
        let user = await User.findOne({ linkedinId });
        if (user) {
          user.linkedinAccessToken = accessToken;
          if (avatar && !user.avatar) user.avatar = avatar;
          await user.save();
          return done(null, user);
        }

        // ── 4. Case B — Existing email account → link LinkedIn to it ───────
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.linkedinId          = linkedinId;
            user.linkedinAccessToken = accessToken;
            if (avatar && !user.avatar) user.avatar = avatar;
            if (!user.headline && profile.given_name)
              user.headline = profile.given_name;
            await user.save();
            return done(null, user);
          }
        }

        // ── 5. Case C — Brand-new user, create account ─────────────────────
        const randomPassword =
          Math.random().toString(36).slice(-10) +
          Math.random().toString(36).slice(-6).toUpperCase() +
          '!7Kx';

        const newUser = await User.create({
          name,
          email:           email || `linkedin_${linkedinId}@noemail.placeholder`,
          password:        randomPassword,
          role:            'candidate',
          avatar,
          isEmailVerified: profile.email_verified || !!email,
          linkedinId,
          linkedinAccessToken: accessToken,
          // Store a minimal snapshot — OIDC gives us name/email/picture only
          linkedinProfile: {
            headline:   '',
            location:   locale || '',
            summary:    '',
            positions:  [],
            educations: [],
          },
        });

        return done(null, newUser);

      } catch (error) {
        // Give a clear error if it is still a permissions issue
        if (error.response?.status === 403) {
          const msg =
            'LinkedIn returned 403. Make sure "Sign In with LinkedIn using OpenID Connect" ' +
            'is added under Products in your LinkedIn Developer app, and that your ' +
            'redirect URI is registered exactly as: ' +
            process.env.LINKEDIN_CALLBACK_URL;
          console.error('[Passport LinkedIn]', msg);
          return done(new Error(msg));
        }

        console.error('[Passport LinkedIn] Verify callback error:', error.message);
        return done(error);
      }
    }
  )
);

// ── Serialise / Deserialise (only needed if using session-based auth) ────────
passport.serializeUser((user, done) =>
  done(null, user._id.toString())
);

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;