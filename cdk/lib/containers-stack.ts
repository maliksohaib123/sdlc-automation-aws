import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface ContainersStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class ContainersStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsTaskDefinition: ecs.FargateTaskDefinition;
  public readonly ecsFargateService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ContainersStackProps) {
    super(scope, id, props);

    const { vpc } = props;

    const ecrRepository = new ecr.Repository(this, "EcrPrivateRepository", {
      repositoryName: "sdlc-automation-ecr-repo",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: true,
    });

    const cluster = new ecs.Cluster(this, "EcsCluster", {
      vpc,
      enableFargateCapacityProviders: true,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "FargateTaskDefinition", {
      cpu: 512,
      memoryLimitMiB: 1024,
    });
    taskDefinition.addContainer("Container", {
      containerName: "sdlc-automation",
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository, "latest"),
      environment: {
        PORT: "80",
      },
      essential: true,
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost:80/health || exit 1"],
        interval: cdk.Duration.seconds(30),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(30),
      },
      portMappings: [
        {
          containerPort: 80,
          hostPort: 80,
          protocol: ecs.Protocol.TCP,
        },
      ],
    });

    const fargateServiceSg = new ec2.SecurityGroup(this, "FargateServiceSg", { vpc });
    fargateServiceSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "Allow HTTP access to ECS Fargate service");

    const fargateService = new ecs.FargateService(this, "FargateService", {
      cluster: cluster,
      taskDefinition: taskDefinition,
      assignPublicIp: true,
      desiredCount: 0,
      securityGroups: [fargateServiceSg],
    });

    this.ecrRepository = ecrRepository;
    this.ecsCluster = cluster;
    this.ecsTaskDefinition = taskDefinition;
    this.ecsFargateService = fargateService;

    new cdk.CfnOutput(this, "ecrRepositoryUri", {
      value: ecrRepository.repositoryUri,
      description: "ECR Repository URI for the container image",
    });
  }
}
