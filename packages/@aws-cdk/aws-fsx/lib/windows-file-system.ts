import { Connections, ISecurityGroup, ISubnet, Port, SecurityGroup } from '@aws-cdk/aws-ec2';
import { Aws } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { FileSystemAttributes, FileSystemBase, FileSystemProps, IFileSystem } from './file-system';
import { CfnFileSystem } from './fsx.generated';
import { WindowsMaintenanceTime } from './windows-maintenance-time';
import { AuditLogConfiguration } from './audit-log-configuration';
import { SelfManagedActiveDirectoryConfiguration } from './self-managed-AD-configuration';
import { BackupStartTime } from './backup-start-time';

/**
 * The different kinds of file system deployments used by Windows.
 */
export enum WindowsDeploymentType {
  /**
   * Deploys a high availability file system that is configured for Multi-AZ redundancy to tolerate temporary Availability Zone (AZ) unavailability.
   * You can only deploy a Multi-AZ file system in AWS Regions that have a minimum of three Availability Zones. Also supports HDD storage type.
   */
  MULTI_AZ_1 = 'MULTI_AZ_1',
  /**
   * Choose to deploy a file system that is configured for single AZ redundancy.
   */
  SINGLE_AZ_1 = 'SINGLE_AZ_1',
  /**
   * The latest generation Single AZ file system. Specifies a file system that is configured for single AZ redundancy and supports HDD storage type.
   */
  SINGLE_AZ_2 = 'SINGLE_AZ_2',
}

/**
 * The different kinds of storage types used by Windows.
 */
export enum WindowsStorageType {
  /**
   * Multi-AZ file systems are recommended for most production workloads because they have two file servers in separate Availability Zones (AZ),
   * providing continuous availability to data and helping protect your data against instance failure and AZ disruption.
   */
  SSD = 'SSD',
  /**
   * Only use this for development systems, or when continuous availability is not a requirement.
   */
  HDD = 'HDD',
}

/**
 * The configuration for the Amazon FSx for Windows file system.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-fsx-filesystem-windowsconfiguration.html
 */
export interface WindowsConfiguration {
  /**
   * The type of backing file system deployment used by FSx.
   * @default SINGLE_AZ_1
   */
  readonly deploymentType: WindowsDeploymentType;

  /**
   * The ID for an existing AWS Managed Microsoft Active Directory (AD) instance that the file system should join when it's created.
   * Required if you are joining the file system to an existing AWS Managed Microsoft AD.
   * @default - no default, conditionally required when using an existing AWS Managed Microsoft AD.
   */
  readonly activeDirectoryId?: string;

  /**
   * An array of one or more DNS alias names that you want to associate with the Amazon FSx file system.
   */
  readonly aliases?: string[];

  /**
   * The configuration that Amazon FSx for Windows File Server uses to audit and log user accesses of files, folders, and file shares on the Amazon FSx for Windows File Server file system.
   */
  readonly auditLogConfiguration?: AuditLogConfiguration;

  /**
   * The number of days to retain automatic backups.
   * @default 0
   */
  readonly automaticBackupRetentionDays?: number;

  /**
   * A boolean flag indicating whether tags for the file system should be copied to backups.
   * @default false
   */
  readonly copyTagsToBackups?: boolean;

  /**
   * A recurring daily time, in the format HH:MM. HH is the zero-padded hour of the day (0-23), and MM is the zero-padded minute of the hour. For example, 05:00 specifies 5 AM daily.
   * @default - no preference
   */
  readonly dailyAutomaticBackupStartTime?: BackupStartTime;

  /**
   * Required when DeploymentType is set to MULTI_AZ_1. This specifies the subnet in which you want the preferred file server to be located.
   * @default - no default, conditionally required when DeploymentType is set to MULTI_AZ_1.
   */
  readonly preferredSubnetId?: string;

  /**
   * The configuration that Amazon FSx uses to join a FSx for Windows File Server file system or an ONTAP storage virtual machine (SVM) to a self-managed (including on-premises) Microsoft Active Directory (AD) directory.
   */
  readonly selfManagedActiveDirectoryConfiguration?: SelfManagedActiveDirectoryConfiguration;

  /**
   * The type of the storage used by FSx
   */
  readonly storageType?: WindowsStorageType;

  /**
   * Sets the throughput capacity of an Amazon FSx file system, measured in megabytes per second (MB/s)
   */
  readonly throughputCapacity: number;

  /**
   * The preferred day and time to perform weekly maintenance. The first digit is the day of the week, starting at 1
   * for Monday, then the following are hours and minutes in the UTC time zone, 24 hour clock. For example: '2:20:30'
   * is Tuesdays at 20:30.
   *
   * @default - no preference
   */
  readonly weeklyMaintenanceStartTime?: WindowsMaintenanceTime;
}

/**
 * Properties specific to the Windows version of the FSx file system.
 */
export interface WindowsFileSystemProps extends FileSystemProps {
  /**
   * Additional configuration for FSx specific to Windows.
   */
  readonly windowsConfiguration: WindowsConfiguration;

  /**
   * The subnet that the file system will be accessible from.
   */
  readonly vpcSubnet: ISubnet;
}

/**
 * The FSx for Windows File System implementation of IFileSystem.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-fsx-filesystem.html
 *
 * @resource AWS::FSx::FileSystem
 */
export class WindowsFileSystem extends FileSystemBase {

  /**
   * Import an existing FSx for Windows file system from the given properties.
   */
  public static fromWindowsFileSystemAttributes(scope: Construct, id: string, attrs: FileSystemAttributes): IFileSystem {
    class Import extends FileSystemBase {
      public readonly dnsName = attrs.dnsName;
      public readonly fileSystemId = attrs.fileSystemId;
      public readonly connections = WindowsFileSystem.configureConnections(attrs.securityGroup);
    }

    return new Import(scope, id);
  }

  /**
   * The default FSx file system type used by FSx for Windows.
   */
  private static readonly DEFAULT_FILE_SYSTEM_TYPE: string = 'WINDOWS';

  /**
   * The default ports the file system listens on. Actual port list is: [988, 1021, 1022, 1023]
   */
  private static readonly DEFAULT_PORT_RANGE = { startPort: 988, endPort: 1023 };

  /**
   * Configures a Connections object with all the ports required by FSx for Windows
   */
  private static configureConnections(securityGroup: ISecurityGroup): Connections {
    const connections = new Connections({
      securityGroups: [securityGroup],
      defaultPort: Port.tcpRange(
        WindowsFileSystem.DEFAULT_PORT_RANGE.startPort,
        WindowsFileSystem.DEFAULT_PORT_RANGE.endPort),
    });

    return connections;
  }

  /**
   * The security groups/rules used to allow network connections to the file system.
   */
  public readonly connections: Connections;

  /**
   * The DNS name assigned to this file system.
   */
  public readonly dnsName: string;

  /**
   * The ID that AWS assigns to the file system.
   */
  public readonly fileSystemId: string;

  /**
   * The encapsulated L1 file system.
   */
  private readonly fileSystem: CfnFileSystem;

  constructor(scope: Construct, id: string, props: WindowsFileSystemProps) {
    super(scope, id);

    this.validateProps(props);

    const updatedWindowsProps = {
       dailyAutomaticBackupStartTime: props.windowsConfiguration.dailyAutomaticBackupStartTime?.toTimestamp(),
       weeklyMaintenanceStartTime: props.windowsConfiguration.weeklyMaintenanceStartTime?.toTimestamp(),
    };
    const windowsConfiguration = Object.assign({}, props.windowsConfiguration, updatedWindowsProps);

    const securityGroup = (props.securityGroup || new SecurityGroup(this, 'FsxWindowsSecurityGroup', {
      vpc: props.vpc,
    }));
    securityGroup.addIngressRule(
      securityGroup,
      Port.tcpRange(WindowsFileSystem.DEFAULT_PORT_RANGE.startPort, WindowsFileSystem.DEFAULT_PORT_RANGE.endPort));
    this.connections = WindowsFileSystem.configureConnections(securityGroup);

    this.fileSystem = new CfnFileSystem(this, 'Resource', {
      fileSystemType: WindowsFileSystem.DEFAULT_FILE_SYSTEM_TYPE,
      subnetIds: [props.vpcSubnet.subnetId],
      backupId: props.backupId,
      kmsKeyId: (props.kmsKey ? props.kmsKey.keyId : undefined),
      windowsConfiguration,
      securityGroupIds: [securityGroup.securityGroupId],
      storageCapacity: props.storageCapacityGiB,
    });
    this.fileSystem.applyRemovalPolicy(props.removalPolicy);

    this.fileSystemId = this.fileSystem.ref;
    this.dnsName = `${this.fileSystemId}.fsx.${this.env.region}.${Aws.URL_SUFFIX}`;
  }

  /**
   * Validates the props provided for a new FSx for Windows file system.
   */
  private validateProps(props: WindowsFileSystemProps) {
    const windowsConfiguration = props.windowsConfiguration;
    this.validateActiveDirectoryId(windowsConfiguration.activeDirectoryId);
    this.validateThroughputCapacity(windowsConfiguration.throughputCapacity);
    this.validateAliases(windowsConfiguration.aliases);
    this.validatePreferredSubnetId(windowsConfiguration.deploymentType, windowsConfiguration.preferredSubnetId,);
    this.validateDnsIps(windowsConfiguration.selfManagedActiveDirectoryConfiguration?.dnsIps);
    this.validateDomainName(windowsConfiguration.selfManagedActiveDirectoryConfiguration?.domainName);
    this.validateFileSystemAdministratorsGroup(windowsConfiguration.selfManagedActiveDirectoryConfiguration?.fileSystemAdministratorsGroup);
    this.validateOrganizationalUnitDistinguishedName(windowsConfiguration.selfManagedActiveDirectoryConfiguration?.organizationalUnitDistinguishedName);
    this.validatePassword(windowsConfiguration.selfManagedActiveDirectoryConfiguration?.password);
    this.validateUsername(windowsConfiguration.selfManagedActiveDirectoryConfiguration?.username);
    this.validateARN(windowsConfiguration.auditLogConfiguration?.auditLogDestination);
  }

  /**
   * Validates the Active Directory Id.
   */
   private validateActiveDirectoryId(activeDirectoryId?: string): void  {
    const activeDirectoryRegex = new RegExp('^d-[0-9a-f]{10}$');
    if (activeDirectoryId && !activeDirectoryRegex.test(activeDirectoryId)) {
      throw new Error('Active Directory ID must begin with the literal d- and should be followed by exactly 10 alphanumeric characters. Allowed alphanumeric values include 0-9 and a-f.');
    }
  }

  /**
   * Validates the throughput capacity is an acceptable value.
   */
  private validateThroughputCapacity(throughputCapacity: number): void {
    if ((throughputCapacity < 8 || throughputCapacity > 4096) || !(Math.log2(throughputCapacity) % 1 === 0)) {
      throw new Error('Throughput Capacity must be between 8 and 4096 GiB and a power of 2');
    }
  }

  /**
   * Validates the count of DNS aliases.
   */
   private validateAliases(aliases?: string[]): void  {
    if (aliases && aliases.length > 50) {
      throw new Error('List must not exceed 50 DNS alias names.');
    }
  }

  /**
   * Validates that the PreferredSubnetId is defined based on the deploymentType.
   */
  private validatePreferredSubnetId(deploymentType: WindowsDeploymentType, preferredSubnetId?: string): void  {
    if (deploymentType === WindowsDeploymentType.MULTI_AZ_1 && preferredSubnetId === undefined) {
      throw new Error('Preferred Subnet ID is required when deploymentType is set to MULTI_AZ_1');
    }
  }

  /**
   * Validates the count of DNS IP addresses in the self managed Active Directory configuration.
   */
  private validateDnsIps(dnsIps?: string[]): void  {
    if (dnsIps && dnsIps.length > 3) {
      throw new Error('List must not exceed 3 DNS IPs.');
    }
  }

  /**
   * Validates the domain name in the self managed Active Directory configuration.
   */
  private validateDomainName(domainName?: string): void  {
    const domainRegex = new RegExp('^[^\u0000\u0085\u2028\u2029\r\n]{1,255}$');
    if (domainName && !domainRegex.test(domainName)) {
      throw new Error('Value must be a valid Domain Name. It must not contain newline, carriage return, line separator or paragraph separator and must not exceed 255 characters limit.');
    }
  }

  /**
   * Validates the file system administrators group in the self managed Active Directory configuration.
   */
  private validateFileSystemAdministratorsGroup(fileSystemAdministratorsGroup?: string): void  {
    const fsAdminGroupRegex = new RegExp('^[^\u0000\u0085\u2028\u2029\r\n]{1,256}$');
    if (fileSystemAdministratorsGroup && !fsAdminGroupRegex.test(fileSystemAdministratorsGroup)) {
      throw new Error('Value must be a valid Domain Group. It must not contain newline, carriage return, line separator or paragraph separator and must not exceed 256 characters limit.');
    }
  }

  /**
   * Validates the organizational unit distinguished name in the self managed Active Directory configuration.
   */
  private validateOrganizationalUnitDistinguishedName(organizationalUnitDistinguishedName?: string): void  {
    const ouNameRegex = new RegExp('^[^\u0000\u0085\u2028\u2029\r\n]{1,2000}$');
    if (organizationalUnitDistinguishedName && !ouNameRegex.test(organizationalUnitDistinguishedName)) {
      throw new Error('Value must be a valid fully qualified distinguished name of the organizational unit. It must not contain newline, carriage return, line separator or paragraph separator and must not exceed 2000 characters limit.');
    }
  }

  /**
   * Validates the password in the self managed Active Directory configuration.
   */
  private validatePassword(password?: string): void  {
    const passwordRegex = new RegExp('^.{1,256}$');
    if (password && !passwordRegex.test(password)) {
      throw new Error('Password must not exceed 256 characters limit.');
    }
  }

  /**
   * Validates the username in the self managed Active Directory configuration.
   */
  private validateUsername(username?: string): void  {
    const usernameRegex = new RegExp('^[^\u0000\u0085\u2028\u2029\r\n]{1,256}$');
    if (username && !usernameRegex.test(username)) {
      throw new Error('Username must not contain newline, carriage return, line separator or paragraph separator and must not exceed 256 characters limit.');
    }
  }

  /**
   * Validates the ARN for the audit log destination in the audit log configuration.
   */
  private validateARN (auditLogDestination?: string): void {

    const regexARN = new RegExp('^arn:[^:]{1,63}:[^:]{0,63}:[^:]{0,63}:(?:|\d{12}):[^/].{0,1023}$');
    if (auditLogDestination && !regexARN.test(auditLogDestination)) {
      throw new Error('Audit Log Destination must be a valid ARN');
    }
  }

}
