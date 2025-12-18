export default function AccessDenied({
  title = 'Forbidden',
  message = "You don't have permission to view this page.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main className="page-container relative">
      <div className="container-standard relative">
        <div className="card max-w-2xl">
          <h1 className="heading-lg font-goldplay text-iki-white">{title}</h1>
          <p className="body-md text-iki-white/70 mt-2">{message}</p>
        </div>
      </div>
    </main>
  );
}
