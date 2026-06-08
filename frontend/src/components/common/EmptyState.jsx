export default function EmptyState({ icon = '🔍', title, description, action }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}