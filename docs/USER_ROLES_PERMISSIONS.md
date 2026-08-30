# Roles and Permissions
Roles: Platform Super Admin, Organization Owner/Admin, Branch Manager, Doctor, Dentist, Nurse/Assistant, Receptionist, Accountant, Customer Service, Marketing, Analyst/Read-only, Patient.

Permission domains: tenant, branch, staff, patients, clinical, dental, appointments, billing, CRM, messaging, automation, AI, reports, files, integrations, audit, subscription.

Deny by default. Least privilege. Scope by tenant/branch. Sensitive clinical/financial operations require stronger permissions. AI inherits the execution context and is never an unrestricted superuser.
