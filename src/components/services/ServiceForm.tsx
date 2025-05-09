export interface ServiceFormProps {
  service: any;
  categories?: any[];
  onSuccess?: (service: any, isEdit: boolean) => void;
}

export function ServiceForm({
  service,
  categories,
  onSuccess
}: ServiceFormProps) {
  // Implement your form here or leave it as a stub if it exists elsewhere
  return (
    <div>
      {/* Service form implementation */}
    </div>
  );
}
