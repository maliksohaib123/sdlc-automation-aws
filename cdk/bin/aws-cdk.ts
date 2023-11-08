#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";
import { ContainersStack } from "../lib/containers-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App({});

const vpcStack = new VpcStack(app, "VpcStack");

const containersStack = new ContainersStack(app, "ContainersStack", {
  vpc: vpcStack.vpc,
});

new PipelineStack(app, "PipelineStack", {
  ecrRepository: containersStack.ecrRepository,
  ecsFargateService: containersStack.ecsFargateService,
});
