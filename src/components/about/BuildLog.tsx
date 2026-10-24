import styles from "./About.module.css";

type Release = [ver: string, company: string, role: string, when: string, notes: string[], latest?: boolean];

// every job shipped a new version of me, newest release first
const LOG: Release[] = [
  ["v6.0", "Freshpaint", "GTM AI Operations Manager", "Feb 2025 to now", ["Built Distill, Event Hub and seven more tools the sales and marketing teams run on", "Put AI agents on deal attribution and contact research"], true],
  ["v5.0", "Freshpaint", "Revenue Operations Manager", "Aug 2024 to Feb 2025", ["Joined as employee 30, when the company made $10M a year", "Rebuilt sales territories, lead routing and the SDR team from scratch"]],
  ["v4.0", "Rattle", "Operations Manager, Sales and Marketing", "May 2023 to Aug 2024", ["Built all of the sales and marketing automation", "Leads became opportunities 160% faster", "New tools added $6.4M in pipeline"]],
  ["v3.0", "Metadata.io", "Marketing Operations Manager", "Oct 2021 to May 2023", ["Chatbot experiences drove $8.3M in pipeline and $5.5M in revenue", "Rebuilt HubSpot from the ground up"]],
  ["v2.1", "ForgeRock", "Global Marketing Operations Consultant", "2021", ["Ran Marketo across the Americas, Europe and Asia Pacific: nurture programs, webinars and events"]],
  ["v2.0", "Publicis Groupe", "Business Intelligence Analyst", "2020 to 2021", ["Turned 50+ data streams into dashboards for a top pharmaceutical client", "Steered $50M+ a quarter in media spend"]],
  ["v1.1", "J.P. Morgan", "Marketing Automation Consultant", "2019 to 2020", ["Automated the email and sign-ups for in-person events across the US"]],
  ["v1.0", "BigTime Software", "Marketing Analyst", "2018 to 2019", ["Ran campaigns across LinkedIn, Google Ads and email", "Built the dashboards, in R"]],
  ["v0.1", "Loras College", "Bachelor's degree, Noonan School of Business", "2018", ["Initial commit"]],
];

const longCompact = new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "long", maximumFractionDigits: 1 });

/** `tokens` is this year's AI token count from the usage loader; its line is left out when there is none. */
export function BuildLog({ tokens, year }: { tokens: number; year: number }) {
  return (
    <ol className={styles.log}>
      {LOG.map(([ver, company, role, when, notes, latest]) => (
        <li key={ver} className={latest ? `${styles.rel} ${styles.latest}` : styles.rel}>
          <p className={styles.ver}>
            {ver}
            <small>{latest ? "Latest" : when.split(" ").pop()}</small>
          </p>
          <div className={styles.what}>
            <h3>{company}</h3>
            <p className={styles.role}>
              {role} · {when}
            </p>
            <ul>
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
              {latest && tokens > 0 && <li>Used {longCompact.format(tokens)} AI tokens in {year} alone</li>}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}
