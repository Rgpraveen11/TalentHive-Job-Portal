import { statusColor } from '../../utils/helpers';

export default function ApplicationStatusBadge({ status }) {
  return (
    <span className={statusColor(status)}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}