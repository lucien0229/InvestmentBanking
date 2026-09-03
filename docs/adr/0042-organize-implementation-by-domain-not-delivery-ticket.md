# Organize implementation by domain, not delivery ticket

**Status: accepted**

Delivery Tickets remain requirements and evidence references only. Application code, database objects, migrations, tests, runtime identifiers, and deployment configuration are organized by the canonical business domains and shared infrastructure so that multiple Tickets can evolve one domain without creating Ticket-shaped modules or persistent identifiers.

Consequently, the implemented Ticket-shaped baseline is being rebuilt as a domain-named migration baseline in the development environment. Existing Git history and release evidence remain historical records; they do not define current implementation boundaries.
