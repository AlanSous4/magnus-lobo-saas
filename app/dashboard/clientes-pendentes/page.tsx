import ClientesPendentesClient from "./clientes-pendentes-client";

export default function Page() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">
        Clientes Pendentes
      </h1>

      <ClientesPendentesClient />
    </div>
  );
}