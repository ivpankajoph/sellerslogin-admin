function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="shell-card-strong p-6">
      <div className="space-y-4">
        <div className="loading-skeleton h-4 w-36" />
        <div className="loading-skeleton h-4 w-60" />
        <div className="loading-skeleton h-28 w-full" />
        <p className="pt-1 text-sm text-ui-body">{message}</p>
      </div>
    </div>
  )
}

export default LoadingState
