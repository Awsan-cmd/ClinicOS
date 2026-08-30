# Data Model
Core entities:
Organization/Tenant, Branch, User, Membership, Role, Permission, Patient, PatientConsent, Provider, Service, Resource, AvailabilityRule, Appointment, Encounter, ClinicalRecord, DentalChart, ToothRecord, TreatmentPlan, TreatmentItem, Invoice, InvoiceItem, Payment, Refund, Lead, LeadStage, Campaign, Task, Conversation, ConversationParticipant, Message, MessageAttachment, ChannelAccount, WebhookEvent, ProviderEvent, Automation, Trigger, Action, Execution, KnowledgeBase, KnowledgeDocument, KnowledgeChunk, AIConversation, AIToolCall, AIAuditEvent, Notification, DeliveryAttempt, File, Attachment, AuditEvent, Subscription, Plan, UsageRecord.

Rules: consistent UUID/ULID strategy; safe decimal money; consistent timestamps; tenant-scoped indexes; deliberate soft delete; foreign keys.
