export default function ChannelLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 animate-pulse">
      {/* Header Card */}
      <div className="-mx-4 sm:mx-0">
        <div className="rounded-none border-0 shadow-none sm:rounded-lg sm:border bg-card">
          <div className="bg-muted p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-48 rounded bg-muted-foreground/20" />
                <div className="h-4 w-3/4 rounded bg-muted-foreground/20" />
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-6 border-t">
            <div className="h-10 w-40 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="-mx-4 sm:mx-0 divide-y divide-border sm:divide-y-0 sm:space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-none border-0 shadow-none sm:rounded-lg sm:border bg-card p-3 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
              <div className="h-8 w-8 rounded bg-muted" />
            </div>

            <div className="h-6 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <div className="h-5 w-8 rounded bg-muted" />
                <div className="h-5 w-8 rounded bg-muted" />
              </div>
              <div className="h-8 w-28 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
