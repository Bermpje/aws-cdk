import { strictEqual } from 'assert';
import { Template } from '@aws-cdk/assertions';
import { ISubnet, SecurityGroup, Subnet, Vpc } from '@aws-cdk/aws-ec2';
import { Key } from '@aws-cdk/aws-kms';
import { Aws, Stack } from '@aws-cdk/core';
import { WindowsConfiguration, WindowsDeploymentType, WindowsFileSystem, WindowsStorageType } from '../lib';

describe('FSx for Windows File System', () => {
  let windowsConfiguration: WindowsConfiguration;
  let stack: Stack;
  let storageCapacity: number;
  let throughputCapacity: number;
  let vpcSubnet: ISubnet;
  let vpc: Vpc;

  beforeEach(() => {
    stack = new Stack();
    storageCapacity = 1200;
    throughputCapacity = 8;
    vpc = new Vpc(stack, 'VPC');
    vpcSubnet = new Subnet(stack, 'Subnet', {
      availabilityZone: 'eu-central-1',
      cidrBlock: vpc.vpcCidrBlock,
      vpcId: vpc.vpcId,
    });
  });

  test('default file system is created correctly', () => {
    windowsConfiguration = {
      deploymentType: WindowsDeploymentType.SINGLE_AZ_1,
      storageType: WindowsStorageType.SSD,
      throughputCapacity,
    };

    const fileSystem = new WindowsFileSystem(stack, 'FsxFileSystem', {
      windowsConfiguration,
      storageCapacityGiB: storageCapacity,
      vpc,
      vpcSubnet,
    });

    Template.fromStack(stack).hasResource('AWS::FSx::FileSystem', {});
    Template.fromStack(stack).hasResource('AWS::EC2::SecurityGroup', {});
    strictEqual(
      fileSystem.dnsName,
      `${fileSystem.fileSystemId}.fsx.${stack.region}.${Aws.URL_SUFFIX}`);

    Template.fromStack(stack).hasResource('AWS::FSx::FileSystem', {
      DeletionPolicy: 'Retain',
    });
  });

  test('file system is created correctly when security group is provided', () => {
    windowsConfiguration = {
      deploymentType: WindowsDeploymentType.SINGLE_AZ_1,
      storageType: WindowsStorageType.SSD,
      throughputCapacity,
    };

    const securityGroup = new SecurityGroup(stack, 'FsxLustreSecurityGroup', {
      vpc,
    });

    new WindowsFileSystem(stack, 'FsxFileSystem', {
      windowsConfiguration,
      securityGroup,
      storageCapacityGiB: storageCapacity,
      vpc,
      vpcSubnet,
    });

    Template.fromStack(stack).hasResource('AWS::FSx::FileSystem', {});
    Template.fromStack(stack).hasResource('AWS::EC2::SecurityGroup', {});
  });

  test('encrypted file system is created correctly with custom KMS', () => {
    windowsConfiguration = {
      deploymentType: WindowsDeploymentType.SINGLE_AZ_1,
      storageType: WindowsStorageType.SSD,
      throughputCapacity,
    };

    const key = new Key(stack, 'customKeyFS');

    new WindowsFileSystem(stack, 'FsxFileSystem', {
      kmsKey: key,
      windowsConfiguration,
      storageCapacityGiB: storageCapacity,
      vpc,
      vpcSubnet,
    });

    /**
         * CDK appends 8-digit MD5 hash of the resource path to the logical Id of the resource in order to make sure
         * that the id is unique across multiple stacks. There isnt a direct way to identify the exact name of the resource
         * in generated CDK, hence hardcoding the MD5 hash here for assertion. Assumption is that the path of the Key wont
         * change in this UT. Checked the unique id by generating the cloud formation stack.
         */
    Template.fromStack(stack).hasResourceProperties('AWS::FSx::FileSystem', {
      KmsKeyId: {
        Ref: 'customKeyFSDDB87C6D',
      },
    });
  });

  describe('when validating props', () => {
    describe('throughputCapacity', () => {
      test.each([
        8,
        64,
        512,
        4096,
      ])('proper multiple for throughput capacity of %d', (value: number) => {
        windowsConfiguration = {
          deploymentType: WindowsDeploymentType.SINGLE_AZ_1,
          storageType: WindowsStorageType.SSD,
          throughputCapacity: value,
        };

        new WindowsFileSystem(stack, 'FsxFileSystem', {
          windowsConfiguration,
          storageCapacityGiB: storageCapacity,
          vpc,
          vpcSubnet,
        });

        Template.fromStack(stack).hasResourceProperties('AWS::FSx::FileSystem', {
          WindowsConfiguration: {
            DeploymentType: WindowsDeploymentType.SINGLE_AZ_1,
            ThroughputCapacity: value,
          },
        });
      });

      test.each([
        7,
        9,
        4095,
        4097,
      ])('invalid value of %d for throughput capacity', (invalidValue: number) => {
        windowsConfiguration = {
          deploymentType: WindowsDeploymentType.SINGLE_AZ_1,
          storageType: WindowsStorageType.SSD,
          throughputCapacity: invalidValue,
        };

        expect(() => {
          new WindowsFileSystem(stack, 'FsxFileSystem', {
            windowsConfiguration,
            storageCapacityGiB: storageCapacity,
            vpc,
            vpcSubnet,
          });
        }).toThrowError(/throughput capacity must be between 8 and 4096 GiB and a power of 2/);
      });

    });
  });
});