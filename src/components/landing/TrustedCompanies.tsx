const companies = ["Qualcomm", "IBM", "Sony", "Adobe", "Samsung"];

const TrustedCompanies = () => (
  <section>
    <div className="container flex items-center justify-between">
      <div className="text-center w-64 mr-12">
        <p className="text-muted-foreground font-bold text-sm max-w-48 text-left">
          Trusted by top firms serving leading companies
        </p>
      </div>
      <div className="flex justify-between w-full items-center gap-12 md:gap-16">
        {companies.map((name) => (
          <div
            key={name}
            className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-300 text-muted-foreground font-semibold text-lg"
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustedCompanies;