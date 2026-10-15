import { PageHeader } from "@/components/PageHeader";
import { requireSession } from "@/lib/auth";
import { CustomerForm } from "../CustomerForm";

export default async function NewCustomerPage() {
  const { sector } = await requireSession();
  return (
    <>
      <PageHeader title={`Nuevo ${sector.terms.customer.toLowerCase()}`} />
      <div className="max-w-3xl">
        <CustomerForm fields={sector.customerFields} values={{ name: "", email: "", phone: "", taxId: "", address: "", notes: "", attributes: {} }} />
      </div>
    </>
  );
}
