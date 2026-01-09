import { relations } from "drizzle-orm/relations";
import {
  teams,
  users,
  bankConnections,
  bankAccounts,
  transactions,
  transactionCategories,
  tags,
  transactionTags,
  transactionAttachments,
  customers,
  customerTags,
  invoices,
  invoiceTemplates,
  invoiceProducts,
  trackerProjects,
  trackerEntries,
  trackerProjectTags,
  trackerReports,
  reports,
  inboxAccounts,
  inbox,
  inboxBlocklist,
  documents,
  documentTags,
  transactionEmbeddings,
  inboxEmbeddings,
  transactionMatchSuggestions,
  transactionEnrichments,
  userInvites,
  apps,
  apiKeys,
  shortLinks,
  oauthApplications,
  oauthAuthorizationCodes,
  oauthAccessTokens,
  activities,
  notificationSettings,
  documentTagAssignments,
  usersOnTeam,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
  bankAccounts: many(bankAccounts),
  transactions: many(transactions),
  invoices: many(invoices),
  invoiceProducts: many(invoiceProducts),
  trackerEntries: many(trackerEntries),
  trackerReports: many(trackerReports),
  reports: many(reports),
  documents: many(documents),
  transactionMatchSuggestions: many(transactionMatchSuggestions),
  userInvites: many(userInvites),
  apps: many(apps),
  apiKeys: many(apiKeys),
  shortLinks: many(shortLinks),
  oauthApplications: many(oauthApplications),
  oauthAuthorizationCodes: many(oauthAuthorizationCodes),
  oauthAccessTokens: many(oauthAccessTokens),
  activities: many(activities),
  notificationSettings: many(notificationSettings),
  usersOnTeams: many(usersOnTeam),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  users: many(users),
  bankConnections: many(bankConnections),
  bankAccounts: many(bankAccounts),
  transactions: many(transactions),
  tags: many(tags),
  transactionTags: many(transactionTags),
  transactionAttachments: many(transactionAttachments),
  customers: many(customers),
  customerTags: many(customerTags),
  invoices: many(invoices),
  invoiceTemplates: many(invoiceTemplates),
  invoiceProducts: many(invoiceProducts),
  trackerProjects: many(trackerProjects),
  trackerEntries: many(trackerEntries),
  trackerProjectTags: many(trackerProjectTags),
  trackerReports: many(trackerReports),
  reports: many(reports),
  inboxAccounts: many(inboxAccounts),
  inboxes: many(inbox),
  inboxBlocklists: many(inboxBlocklist),
  documents: many(documents),
  documentTags: many(documentTags),
  transactionEmbeddings: many(transactionEmbeddings),
  inboxEmbeddings: many(inboxEmbeddings),
  transactionMatchSuggestions: many(transactionMatchSuggestions),
  transactionEnrichments: many(transactionEnrichments),
  userInvites: many(userInvites),
  apps: many(apps),
  apiKeys: many(apiKeys),
  shortLinks: many(shortLinks),
  oauthApplications: many(oauthApplications),
  oauthAuthorizationCodes: many(oauthAuthorizationCodes),
  oauthAccessTokens: many(oauthAccessTokens),
  activities: many(activities),
  notificationSettings: many(notificationSettings),
  documentTagAssignments: many(documentTagAssignments),
  usersOnTeams: many(usersOnTeam),
  transactionCategories: many(transactionCategories),
}));

export const bankConnectionsRelations = relations(
  bankConnections,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [bankConnections.teamId],
      references: [teams.id],
    }),
    bankAccounts: many(bankAccounts),
  }),
);

export const bankAccountsRelations = relations(
  bankAccounts,
  ({ one, many }) => ({
    bankConnection: one(bankConnections, {
      fields: [bankAccounts.bankConnectionId],
      references: [bankConnections.id],
    }),
    user: one(users, {
      fields: [bankAccounts.createdBy],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [bankAccounts.teamId],
      references: [teams.id],
    }),
    transactions: many(transactions),
  }),
);

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [transactions.assignedId],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [transactions.teamId],
      references: [teams.id],
    }),
    bankAccount: one(bankAccounts, {
      fields: [transactions.bankAccountId],
      references: [bankAccounts.id],
    }),
    transactionCategory: one(transactionCategories, {
      fields: [transactions.teamId],
      references: [transactionCategories.teamId],
    }),
    transactionTags: many(transactionTags),
    transactionAttachments: many(transactionAttachments),
    inboxes: many(inbox),
    transactionEmbeddings: many(transactionEmbeddings),
    transactionMatchSuggestions: many(transactionMatchSuggestions),
  }),
);

export const transactionCategoriesRelations = relations(
  transactionCategories,
  ({ one, many }) => ({
    transactions: many(transactions),
    transactionEnrichments: many(transactionEnrichments),
    transactionCategory: one(transactionCategories, {
      fields: [transactionCategories.parentId],
      references: [transactionCategories.id],
      relationName: "transactionCategories_parentId_transactionCategories_id",
    }),
    transactionCategories: many(transactionCategories, {
      relationName: "transactionCategories_parentId_transactionCategories_id",
    }),
    team: one(teams, {
      fields: [transactionCategories.teamId],
      references: [teams.id],
    }),
  }),
);

export const tagsRelations = relations(tags, ({ one, many }) => ({
  team: one(teams, {
    fields: [tags.teamId],
    references: [teams.id],
  }),
  transactionTags: many(transactionTags),
  customerTags: many(customerTags),
  trackerProjectTags: many(trackerProjectTags),
}));

export const transactionTagsRelations = relations(
  transactionTags,
  ({ one }) => ({
    tag: one(tags, {
      fields: [transactionTags.tagId],
      references: [tags.id],
    }),
    team: one(teams, {
      fields: [transactionTags.teamId],
      references: [teams.id],
    }),
    transaction: one(transactions, {
      fields: [transactionTags.transactionId],
      references: [transactions.id],
    }),
  }),
);

export const transactionAttachmentsRelations = relations(
  transactionAttachments,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [transactionAttachments.teamId],
      references: [teams.id],
    }),
    transaction: one(transactions, {
      fields: [transactionAttachments.transactionId],
      references: [transactions.id],
    }),
    inboxes: many(inbox),
  }),
);

export const customersRelations = relations(customers, ({ one, many }) => ({
  team: one(teams, {
    fields: [customers.teamId],
    references: [teams.id],
  }),
  customerTags: many(customerTags),
  invoices: many(invoices),
  trackerProjects: many(trackerProjects),
}));

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTags.customerId],
    references: [customers.id],
  }),
  tag: one(tags, {
    fields: [customerTags.tagId],
    references: [tags.id],
  }),
  team: one(teams, {
    fields: [customerTags.teamId],
    references: [teams.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  team: one(teams, {
    fields: [invoices.teamId],
    references: [teams.id],
  }),
}));

export const invoiceTemplatesRelations = relations(
  invoiceTemplates,
  ({ one }) => ({
    team: one(teams, {
      fields: [invoiceTemplates.teamId],
      references: [teams.id],
    }),
  }),
);

export const invoiceProductsRelations = relations(
  invoiceProducts,
  ({ one }) => ({
    user: one(users, {
      fields: [invoiceProducts.createdBy],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [invoiceProducts.teamId],
      references: [teams.id],
    }),
  }),
);

export const trackerProjectsRelations = relations(
  trackerProjects,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [trackerProjects.customerId],
      references: [customers.id],
    }),
    team: one(teams, {
      fields: [trackerProjects.teamId],
      references: [teams.id],
    }),
    trackerEntries: many(trackerEntries),
    trackerProjectTags: many(trackerProjectTags),
    trackerReports: many(trackerReports),
  }),
);

export const trackerEntriesRelations = relations(trackerEntries, ({ one }) => ({
  user: one(users, {
    fields: [trackerEntries.assignedId],
    references: [users.id],
  }),
  trackerProject: one(trackerProjects, {
    fields: [trackerEntries.projectId],
    references: [trackerProjects.id],
  }),
  team: one(teams, {
    fields: [trackerEntries.teamId],
    references: [teams.id],
  }),
}));

export const trackerProjectTagsRelations = relations(
  trackerProjectTags,
  ({ one }) => ({
    tag: one(tags, {
      fields: [trackerProjectTags.tagId],
      references: [tags.id],
    }),
    trackerProject: one(trackerProjects, {
      fields: [trackerProjectTags.trackerProjectId],
      references: [trackerProjects.id],
    }),
    team: one(teams, {
      fields: [trackerProjectTags.teamId],
      references: [teams.id],
    }),
  }),
);

export const trackerReportsRelations = relations(trackerReports, ({ one }) => ({
  user: one(users, {
    fields: [trackerReports.createdBy],
    references: [users.id],
  }),
  trackerProject: one(trackerProjects, {
    fields: [trackerReports.projectId],
    references: [trackerProjects.id],
  }),
  team: one(teams, {
    fields: [trackerReports.teamId],
    references: [teams.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [reports.teamId],
    references: [teams.id],
  }),
}));

export const inboxAccountsRelations = relations(
  inboxAccounts,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [inboxAccounts.teamId],
      references: [teams.id],
    }),
    inboxes: many(inbox),
  }),
);

export const inboxRelations = relations(inbox, ({ one, many }) => ({
  transactionAttachment: one(transactionAttachments, {
    fields: [inbox.attachmentId],
    references: [transactionAttachments.id],
  }),
  inboxAccount: one(inboxAccounts, {
    fields: [inbox.inboxAccountId],
    references: [inboxAccounts.id],
  }),
  team: one(teams, {
    fields: [inbox.teamId],
    references: [teams.id],
  }),
  transaction: one(transactions, {
    fields: [inbox.transactionId],
    references: [transactions.id],
  }),
  inboxEmbeddings: many(inboxEmbeddings),
  transactionMatchSuggestions: many(transactionMatchSuggestions),
}));

export const inboxBlocklistRelations = relations(inboxBlocklist, ({ one }) => ({
  team: one(teams, {
    fields: [inboxBlocklist.teamId],
    references: [teams.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.ownerId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [documents.teamId],
    references: [teams.id],
  }),
  documentTagAssignments: many(documentTagAssignments),
}));

export const documentTagsRelations = relations(
  documentTags,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [documentTags.teamId],
      references: [teams.id],
    }),
    documentTagAssignments: many(documentTagAssignments),
  }),
);

export const transactionEmbeddingsRelations = relations(
  transactionEmbeddings,
  ({ one }) => ({
    team: one(teams, {
      fields: [transactionEmbeddings.teamId],
      references: [teams.id],
    }),
    transaction: one(transactions, {
      fields: [transactionEmbeddings.transactionId],
      references: [transactions.id],
    }),
  }),
);

export const inboxEmbeddingsRelations = relations(
  inboxEmbeddings,
  ({ one }) => ({
    inbox: one(inbox, {
      fields: [inboxEmbeddings.inboxId],
      references: [inbox.id],
    }),
    team: one(teams, {
      fields: [inboxEmbeddings.teamId],
      references: [teams.id],
    }),
  }),
);

export const transactionMatchSuggestionsRelations = relations(
  transactionMatchSuggestions,
  ({ one }) => ({
    inbox: one(inbox, {
      fields: [transactionMatchSuggestions.inboxId],
      references: [inbox.id],
    }),
    team: one(teams, {
      fields: [transactionMatchSuggestions.teamId],
      references: [teams.id],
    }),
    transaction: one(transactions, {
      fields: [transactionMatchSuggestions.transactionId],
      references: [transactions.id],
    }),
    user: one(users, {
      fields: [transactionMatchSuggestions.userId],
      references: [users.id],
    }),
  }),
);

export const transactionEnrichmentsRelations = relations(
  transactionEnrichments,
  ({ one }) => ({
    transactionCategory: one(transactionCategories, {
      fields: [transactionEnrichments.teamId],
      references: [transactionCategories.teamId],
    }),
    team: one(teams, {
      fields: [transactionEnrichments.teamId],
      references: [teams.id],
    }),
  }),
);

export const userInvitesRelations = relations(userInvites, ({ one }) => ({
  team: one(teams, {
    fields: [userInvites.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [userInvites.invitedBy],
    references: [users.id],
  }),
}));

export const appsRelations = relations(apps, ({ one }) => ({
  user: one(users, {
    fields: [apps.createdBy],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [apps.teamId],
    references: [teams.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  team: one(teams, {
    fields: [apiKeys.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const shortLinksRelations = relations(shortLinks, ({ one }) => ({
  team: one(teams, {
    fields: [shortLinks.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [shortLinks.userId],
    references: [users.id],
  }),
}));

export const oauthApplicationsRelations = relations(
  oauthApplications,
  ({ one, many }) => ({
    user: one(users, {
      fields: [oauthApplications.createdBy],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [oauthApplications.teamId],
      references: [teams.id],
    }),
    oauthAuthorizationCodes: many(oauthAuthorizationCodes),
    oauthAccessTokens: many(oauthAccessTokens),
  }),
);

export const oauthAuthorizationCodesRelations = relations(
  oauthAuthorizationCodes,
  ({ one }) => ({
    oauthApplication: one(oauthApplications, {
      fields: [oauthAuthorizationCodes.applicationId],
      references: [oauthApplications.id],
    }),
    team: one(teams, {
      fields: [oauthAuthorizationCodes.teamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [oauthAuthorizationCodes.userId],
      references: [users.id],
    }),
  }),
);

export const oauthAccessTokensRelations = relations(
  oauthAccessTokens,
  ({ one }) => ({
    oauthApplication: one(oauthApplications, {
      fields: [oauthAccessTokens.applicationId],
      references: [oauthApplications.id],
    }),
    team: one(teams, {
      fields: [oauthAccessTokens.teamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [oauthAccessTokens.userId],
      references: [users.id],
    }),
  }),
);

export const activitiesRelations = relations(activities, ({ one }) => ({
  team: one(teams, {
    fields: [activities.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const notificationSettingsRelations = relations(
  notificationSettings,
  ({ one }) => ({
    team: one(teams, {
      fields: [notificationSettings.teamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [notificationSettings.userId],
      references: [users.id],
    }),
  }),
);

export const documentTagAssignmentsRelations = relations(
  documentTagAssignments,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentTagAssignments.documentId],
      references: [documents.id],
    }),
    documentTag: one(documentTags, {
      fields: [documentTagAssignments.tagId],
      references: [documentTags.id],
    }),
    team: one(teams, {
      fields: [documentTagAssignments.teamId],
      references: [teams.id],
    }),
  }),
);

export const usersOnTeamRelations = relations(usersOnTeam, ({ one }) => ({
  team: one(teams, {
    fields: [usersOnTeam.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [usersOnTeam.userId],
    references: [users.id],
  }),
}));
