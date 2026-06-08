const passport = require('passport');
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn OAuth 2.0 Strategy
//
// Flow:
//  1. User clicks "Connect with LinkedIn"
//  2. Browser hits GET /api/auth/linkedin  → passport redirects to LinkedIn
//  3. User approves → LinkedIn redirects to /api/auth/linkedin/callback
//  4. passport-linkedin-oauth2 exchanges code for access token
//  5. This verify callback receives the profile and finds/creates the user
//  6. linkedinCallback controller generates a JWT and redirects to frontend
// ─────────────────────────────────────────────────────────────────────────────
passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: process.env.LINKEDIN_CALLBACK_URL,
      scope: ['openid', 'profile', 'email'],

      // Pass the request object into the verify callback so we can inspect
      // headers if needed (e.g. for account-linking flows later)
      passReqToCallback: true,
    },

    // ── Verify Callback ──────────────────────────────────────────────────────
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // ── Extract email from profile ──────────────────────────────────────
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : null;

        const avatar =
          profile.photos && profile.photos.length > 0
            ? profile.photos[0].value
            : '';

        // ── Build LinkedIn profile snapshot ─────────────────────────────────
        const linkedinProfileData = {
          headline: profile._json?.headline || '',
          location: profile._json?.location?.name || '',
          summary: profile._json?.summary || '',
          positions: profile._json?.positions?.values || [],
          educations: profile._json?.educations?.values || [],
        };

        // ── Case 1: User already exists with this LinkedIn ID ───────────────
        let user = await User.findOne({ linkedinId: profile.id });
        if (user) {
          // Refresh the access token and profile snapshot on every login
          user.linkedinAccessToken = accessToken;
          user.linkedinProfile = linkedinProfileData;
          if (avatar && !user.avatar) user.avatar = avatar;
          await user.save();
          return done(null, user);
        }

        // ── Case 2: User exists with same email (account linking) ───────────
        if (email) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            user.linkedinId = profile.id;
            user.linkedinAccessToken = accessToken;
            user.linkedinProfile = linkedinProfileData;
            if (avatar && !user.avatar) user.avatar = avatar;
            await user.save();
            return done(null, user);
          }
        }

        // ── Case 3: Brand new user — create account from LinkedIn data ──────
        const newUser = await User.create({
          name: profile.displayName || 'LinkedIn User',
          email: email
            ? email.toLowerCase()
            : `linkedin_${profile.id}@placeholder.com`,
          // Random secure password — user can set a real one later
          // via forgot-password flow if they want email/password login too
          password:
            Math.random().toString(36).slice(-8) +
            Math.random().toString(36).slice(-8).toUpperCase() +
            '!1',
          role: 'candidate',
          avatar,
          isEmailVerified: true, // LinkedIn already verified the email
          linkedinId: profile.id,
          linkedinAccessToken: accessToken,
          linkedinProfile: linkedinProfileData,
          // Pre-fill headline from LinkedIn if available
          headline: linkedinProfileData.headline,
          location: linkedinProfileData.location,
        });

        return done(null, newUser);
      } catch (error) {
        console.error('LinkedIn OAuth strategy error:', error.message);
        return done(error, null);
      }
    }
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// serializeUser / deserializeUser
// Only needed when using session-based auth (not JWT).
// Included here for completeness and in case session support is added later.
// In our app, passport.initialize() is used WITHOUT passport.session(),
// so these are not actually called during normal JWT flow.
// ─────────────────────────────────────────────────────────────────────────────
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;