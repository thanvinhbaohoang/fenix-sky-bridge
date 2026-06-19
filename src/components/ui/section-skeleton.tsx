import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const GeneralSectionSkeleton = () => (
  <Card className="border-border">
    <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const ClaimStatusSectionSkeleton = () => (
  <Card className="border-border">
    <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const ReferencesSectionSkeleton = () => (
  <Card className="border-border">
    <CardHeader><Skeleton className="h-6 w-36" /></CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-lg">
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const AmendmentSectionSkeleton = () => (
  <Card className="border-border">
    <CardHeader><Skeleton className="h-6 w-44" /></CardHeader>
    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
  </Card>
);