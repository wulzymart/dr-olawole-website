import { requireAdmin } from "@/lib/auth";
import { loadSettings } from "@/lib/booking/core";
import { todayKey } from "@/lib/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { Exceptions, WeeklyHours, type Exception, type Rule } from "@/components/dashboard/schedule-editor";
import { Card, CardContent } from "@/components/ui/card";

export default async function SchedulePage() {
  const { supabase } = await requireAdmin();
  const { site } = await loadSettings();
  const [rules, ex] = await Promise.all([
    supabase.from("availability_rules").select("weekday,start_time,end_time").order("weekday").order("start_time"),
    supabase.from("availability_exceptions").select("*").gte("on_date", todayKey(site.timezone)).order("on_date"),
  ]);
  return (
    <>
      <PageHeader title="Schedule" description={`When patients can book you. Times are in ${site.timezone.replace("_", " ")}.`} />
      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="weekly">
          <h2 id="weekly" className="mb-3 font-display text-2xl font-semibold">Weekly hours</h2>
          <Card>
            <CardContent className="p-6">
              <WeeklyHours rules={(rules.data ?? []) as Rule[]} />
            </CardContent>
          </Card>
        </section>
        <section aria-labelledby="off">
          <h2 id="off" className="mb-3 font-display text-2xl font-semibold">Time off and special hours</h2>
          <Card>
            <CardContent className="p-6">
              <Exceptions items={(ex.data ?? []) as Exception[]} />
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
