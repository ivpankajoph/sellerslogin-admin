function StatusBadge({ status }) {
  const palette = {
    subscribed: 'bg-[#e8f7ec] text-[#166534]',
    unsubscribed: 'bg-[#edf0f5] text-[#475467]',
    bounced: 'bg-[#fff4e5] text-[#b54708]',
    blocked: 'bg-[#ffe4e6] text-[#9f1239]',
    complained: 'bg-[#ffe4e8] text-[#b42318]',
    suppressed: 'bg-[#f3e8ff] text-[#7e22ce]',
    draft: 'bg-[#edf0f5] text-[#475467]',
    scheduled: 'bg-[#e8f7ec] text-[#166534]',
    sending: 'bg-[#e7f0ff] text-[#175cd3]',
    sent: 'bg-[#e8f7ec] text-[#166534]',
    paused: 'bg-[#fff4e5] text-[#b54708]',
    failed: 'bg-[#ffe4e8] text-[#b42318]',
    archived: 'bg-[#edf0f5] text-[#475467]',
    delivered: 'bg-[#e8f7ec] text-[#166534]',
    opened: 'bg-[#e7f0ff] text-[#175cd3]',
    clicked: 'bg-[#eef4ff] text-[#3538cd]',
    active: 'bg-[#e8f7ec] text-[#166534]',
    inactive: 'bg-[#edf0f5] text-[#475467]',
    pending: 'bg-[#edf0f5] text-[#475467]',
    running: 'bg-[#e7f0ff] text-[#175cd3]',
    completed: 'bg-[#e8f7ec] text-[#166534]',
    exited: 'bg-[#fff4e5] text-[#b54708]',
    super_admin: 'bg-[#f3e8ff] text-[#7e22ce]',
    marketing_manager: 'bg-[#e7f0ff] text-[#175cd3]',
    content_editor: 'bg-[#fff4e5] text-[#b54708]',
    analyst: 'bg-[#e8f7ec] text-[#166534]',
    read_only: 'bg-[#edf0f5] text-[#475467]',
  }

  return (
    <span
      className={`inline-flex px-2.5 py-1 text-[12px] font-semibold capitalize ${
        palette[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {String(status).replaceAll('_', ' ')}
    </span>
  )
}

export default StatusBadge
