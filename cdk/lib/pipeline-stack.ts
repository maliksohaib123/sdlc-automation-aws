import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as logs from "aws-cdk-lib/aws-logs";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";

export interface PipelineStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsFargateService: ecs.FargateService;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { ecrRepository, ecsFargateService } = props;

    const codeRepository = new codecommit.Repository(this, "SdlcAutomationRepository", {
      repositoryName: "sdlc-automation",
    });

    const buildProject = new codebuild.PipelineProject(this, "MyFirstCodeCommitProject", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yaml"),
      environment: {
        buildImage: codebuild.LinuxBuildImage.fromCodeBuildImageId("aws/codebuild/amazonlinux2-x86_64-standard:5.0"),
        computeType: codebuild.ComputeType.SMALL,
        privileged: true, // Required for Docker commands
      },
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, `CodeBuildLogGroup`),
        },
      },
      environmentVariables: {
        AWS_DEFAULT_REGION: {
          value: this.region,
        },
        AWS_ACCOUNT_ID: {
          value: this.account,
        },
        IMAGE_REPO_NAME: {
          value: ecrRepository.repositoryName,
        },
        IMAGE_TAG: {
          value: "latest",
        },
      },
    });

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      })
    );
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ],
        resources: [ecrRepository.repositoryArn],
      })
    );

    const sourceOutput = new codepipeline.Artifact("SourceArtifact");
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: "CodeCommit",
      repository: codeRepository,
      output: sourceOutput,
      branch: "main",
    });

    const buildOutput = new codepipeline.Artifact("BuildArtifact");
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "CodeBuild",
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: "DeployAction",
      service: ecsFargateService,
      input: buildOutput,
      deploymentTimeout: cdk.Duration.minutes(10),
    });

    const pipeline = new codepipeline.Pipeline(this, "MyFirstPipeline", {
      pipelineName: "MyPipeline",
      crossAccountKeys: false,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
        {
          stageName: "Deploy",
          actions: [deployAction],
        },
      ],
    });

    new cdk.CfnOutput(this, "CodeCommitRepoCloneUrlHttp", {
      value: codeRepository.repositoryCloneUrlHttp,
      description: "CodeCommit repository clone URL over HTTP",
    });
    new cdk.CfnOutput(this, "CodeCommitRepoCloneUrlSsh", {
      value: codeRepository.repositoryCloneUrlSsh,
      description: "CodeCommit repository clone URL over SSH",
    });
  }
}
