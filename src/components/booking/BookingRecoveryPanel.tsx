import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { BookingLookupForm } from "./BookingLookupForm";
import { SavedBookingLookups } from "./SavedBookingLookups";
import { PatientEmailLogin } from "./PatientEmailLogin";

interface BookingRecoveryPanelProps {
  heading: string;
  description?: string;
  defaultReferenceCode?: string;
  excludeIds: string[];
}

/**
 * Single entry point for the two ways to recover bookings not tied to this
 * device's anonymous session: by reference + phone, or by verified email.
 * Replaces three separate stacked blocks that gave no indication of which
 * to try first.
 */
export function BookingRecoveryPanel({
  heading,
  description,
  defaultReferenceCode,
  excludeIds,
}: BookingRecoveryPanelProps) {
  return (
    <section aria-labelledby="recovery-heading">
      <h2 id="recovery-heading" className="text-sm font-semibold text-gray-500">
        {heading}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
      <Tabs defaultValue="reference" className="mt-4">
        <TabsList>
          <TabsTrigger value="reference">Par référence</TabsTrigger>
          <TabsTrigger value="email">Par email</TabsTrigger>
        </TabsList>
        <TabsContent value="reference" className="space-y-6">
          <SavedBookingLookups />
          <BookingLookupForm defaultReferenceCode={defaultReferenceCode} />
        </TabsContent>
        <TabsContent value="email">
          <PatientEmailLogin excludeIds={excludeIds} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
