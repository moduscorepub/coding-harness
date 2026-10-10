/**
 * Re-exports from @coding-harness/ai.
 * All credential storage types and the AuthStorage class now live in the ai package.
 */

export type {
	ApiKeyCredential,
	AuthCredential,
	AuthCredentialEntry,
	AuthCredentialStore,
	AuthStorageData,
	AuthStorageOptions,
	CredentialOrigin,
	CredentialOriginKind,
	OAuthAccountIdentity,
	OAuthAccountSummary,
	OAuthCredential,
	ResetCreditAccountStatus,
	ResetCreditRedeemOutcome,
	ResetCreditTarget,
	StoredAuthCredential,
} from "@coding-harness/ai";
export { AuthStorage, REMOTE_REFRESH_SENTINEL, SqliteAuthCredentialStore } from "@coding-harness/ai";
export type { SnapshotResponse } from "@coding-harness/ai/auth-broker/types";
