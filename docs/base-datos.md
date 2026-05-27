# Diseño inicial de base de datos

## Entidades principales

### User

- id
- name
- email
- password_hash
- role
- created_at

### Company

- id
- name
- nif
- email
- phone
- address
- created_at

### Client

- id
- company_id
- name
- nif
- email
- phone
- address
- created_at

### Product

- id
- company_id
- name
- description
- price
- tax_rate
- type
- created_at

### Invoice

- id
- company_id
- client_id
- invoice_number
- issue_date
- due_date
- status
- subtotal
- tax_total
- total
- notes
- created_at

### InvoiceLine

- id
- invoice_id
- product_id
- description
- quantity
- unit_price
- tax_rate
- subtotal
- total