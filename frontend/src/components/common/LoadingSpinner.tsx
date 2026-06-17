export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className={`${sizeMap[size]} animate-spin rounded-full border-4 border-primary border-t-transparent`} />
    </div>
  )
}
