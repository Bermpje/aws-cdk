/**
 * Properties required for setting up a Self Managed Active Directory Configuration for Windows File Server.
 */
export interface SelfManagedActiveDirectoryConfiguration {
  /**
   * A list of up to three IP addresses of DNS servers or domain controllers in the self-managed AD directory.
   */
  readonly dnsIps?: string[];

  /**
   * The fully qualified domain name of the self-managed AD directory, such as corp.example.com.
   */
  readonly domainName?: string;

  /**
   *  The name of the domain group whose members are granted administrative privileges for the file system.
   */
  readonly fileSystemAdministratorsGroup?: string;

  /**
   *  The fully qualified distinguished name of the organizational unit within your self-managed AD directory.
   */
  readonly organizationalUnitDistinguishedName?: string;

  /**
   *  The password for the service account on your self-managed AD domain that Amazon FSx will use to join to your AD domain.
   */
  readonly password?: string;

  /**
   *  The user name for the service account on your self-managed AD domain that Amazon FSx will use to join to your AD domain.
   */
  readonly username?: string;
}

