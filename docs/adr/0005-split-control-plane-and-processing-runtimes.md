# Split control-plane and processing runtimes

The Web application and product control plane use TypeScript, while bounded file, AI, financial-calculation, artifact, rendering, comparison, and evaluation workers use Python. The two runtimes communicate through versioned OpenAPI, JSON Schema, message, and manifest contracts; Python workers return structured results but do not independently commit product-domain transitions, preventing duplicated business rules while retaining the strongest ecosystem for each workload.
