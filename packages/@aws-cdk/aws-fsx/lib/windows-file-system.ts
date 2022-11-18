import { Connections, ISecurityGroup, ISubnet, Port, SecurityGroup } from '@aws-cdk/aws-ec2';
import { Aws } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { FileSystemAttributes, FileSystemBase, FileSystemProps, IFileSystem } from './file-system';
import { CfnFileSystem } from './fsx.generated';

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
   * The type of the storage used by FSx
   */
  readonly storageType: WindowsStorageType;

  /**
   * Sets the throughput capacity of an Amazon FSx file system, measured in megabytes per second (MB/s)
   */
  readonly throughputCapacity: number;

  // /**
  //  * The preferred day and time to perform weekly maintenance. The first digit is the day of the week, starting at 1
  //  * for Monday, then the following are hours and minutes in the UTC time zone, 24 hour clock. For example: '2:20:30'
  //  * is Tuesdays at 20:30.
  //  *
  //  * @default - no preference
  //  */
  // readonly weeklyMaintenanceStartTime?: LustreMaintenanceTime;
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

    // const updatedWindowsProps = {
    //   importedFileChunkSize: props.windowsConfiguration.importedFileChunkSizeMiB,
    //   weeklyMaintenanceStartTime: props.windowsConfiguration.weeklyMaintenanceStartTime?.toTimestamp(),
    // };
    // const windowsConfiguration = Object.assign({}, props.windowsConfiguration, updatedWindowsProps);
    const windowsConfiguration = props.windowsConfiguration;

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
   * Validates the props provided for a new FSx for Lustre file system.
   */
  private validateProps(props: WindowsFileSystemProps) {
    const windowsConfiguration = props.windowsConfiguration;
    const throughputCapacity = windowsConfiguration.throughputCapacity;

    this.validateThroughputCapacity(throughputCapacity);
    this.validateStorageCapacity(props.storageCapacityGiB);
  }

  /**
   * Validates the throughput capacity is an acceptable value.
   */
  private validateThroughputCapacity( throughputCapacity: number): void {
    if ((throughputCapacity < 8 || throughputCapacity > 4096) || !(Math.log2(throughputCapacity) % 1 === 0)) {
      throw new Error('throughput capacity must be between 8 and 4096 GiB and a power of 2');
    }
  }

  /**
   * Validates the storage capacity is an acceptable value for the deployment type.
   */
  private validateStorageCapacity( storageCapacity: number): void {
    if (storageCapacity < 32 || storageCapacity > 65536 ) {
      throw new Error('storageCapacity must be between 32 and 65536 GiB');
    }
  }
}
