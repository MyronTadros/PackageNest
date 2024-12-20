/**
 * Metric Exports Module
 * 
 * This file combines various metric calculation functions to provide a 
 * comprehensive evaluation of a package's quality. It calculates metrics 
 * such as Correctness, Ramp-Up, License compatibility, Responsiveness, 
 * Good Pinning Practice, Bus Factor, and Pull Request activity. The metrics 
 * are then used to compute a NetScore that aggregates these values.
 */

import { fetchRepoInfo } from "./infoRepo.js";
import { calculateRampUpMetric } from "./rampUP.js";
import { calculateCorrectnessMetric } from "./correctness.js";
import { calculateResponsivenessMetric } from "./responsiveness.js";
import { calculateLicenseMetric } from "./license.js";
import { calculatePinningMetric } from "./goodPinning.js";
import { calculatePullRequestMetric } from "./PullRequest.js";
import { calculateBusFactorMetric } from './busFactor.js'; // Import the new function
import { CustomError } from '../utils/types.js'; // Ensure CustomError is imported

export interface PackageRating {
  CorrectnessLatency: number;
  RampUpLatency: number;
  LicenseScore: number;
  BusFactorLatency: number;
  LicenseScoreLatency: number;
  PullRequest: number;
  PullRequestLatency: number;
  GoodPinningPractice: number;
  GoodPinningPracticeLatency: number;
  Correctness: number;
  ResponsiveMaintainerLatency: number;
  NetScoreLatency: number;
  NetScore: number;
  ResponsiveMaintainer: number;
  RampUp: number;
  BusFactor: number;
}

/**
 * Calculates the latency for an operation.
 * 
 * @param startTime - The start time of the operation in milliseconds.
 * @returns The latency in seconds, rounded to three decimal places.
 */
function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

/**
 * Computes the NetScore based on individual metrics.
 * 
 * @param licenseScore - The License compatibility score.
 * @param rampUpScore - The Ramp-Up time score.
 * @param correctnessScore - The Correctness score.
 * @param responsiveMaintainerScore - The Responsiveness score.
 * @param goodPinningPracticeScore - The Good Pinning Practice score (default: 0).
 * @param busFactorScore - The Bus Factor score (default: 0).
 * @param pullRequestScore - The Pull Request activity score (default: 0).
 * @returns An object containing the NetScore.
 */
export function calculateNetScore(
  licenseScore: number,
  rampUpScore: number,
  correctnessScore: number,
  responsiveMaintainerScore: number,
  goodPinningPracticeScore: number = 0,
  busFactorScore: number = 0,
  pullRequestScore: number = 0
): { NetScore: number } {
  return {
    NetScore:
      licenseScore * (
      0.2 * rampUpScore +
      0.2 * correctnessScore +
      0.25 * responsiveMaintainerScore +
      0.05 * goodPinningPracticeScore +
      0.1 * pullRequestScore +
      0.2 * busFactorScore
      )
  };
}

/**
 * Calculates all metrics for a given package input.
 * 
 * @param input - The input string representing the package, either a URL or file path.
 * @returns A promise resolving to a `PackageRating` object containing all metrics and their latencies.
 * @throws A CustomError if metric calculation fails.
 */
export async function calculateMetrics(input: string): Promise<PackageRating> {
  try {
    console.log("Starting metric calculation");
    const { owner, name } = await fetchRepoInfo(input);
    console.log(`Owner: ${owner}, Name: ${name}`);
    const startTime = performance.now();

    // Calculate metrics concurrently
    const [
      { LicenseScore, LicenseScoreLatency },
      { ResponsiveMaintainer, ResponsiveMaintainerLatency },
      { Correctness, CorrectnessLatency },
      { RampUp, RampUpLatency },
      { GoodPinningPractice, GoodPinningPracticeLatency },
      { PullRequest, PullRequestLatency },
      { BusFactor, BusFactorLatency },
    ] = await Promise.all([
      calculateLicenseMetric(owner, name),
      calculateResponsivenessMetric(owner, name),
      calculateCorrectnessMetric(owner, name),
      calculateRampUpMetric(owner, name),
      calculatePinningMetric(owner, name),
      calculatePullRequestMetric(owner, name),
      calculateBusFactorMetric(owner, name),
    ]);

    // Correct the argument order: BusFactor before PullRequest
    let { NetScore } = calculateNetScore(
      LicenseScore,
      RampUp,
      Correctness,
      ResponsiveMaintainer,
      GoodPinningPractice,
      BusFactor, // BusFactor is the 6th parameter
      PullRequest // PullRequest is the 7th parameter
    );

    const NetScoreLatency = getLatency(startTime);
    NetScore = Number(NetScore.toFixed(3));

    const data: PackageRating = {
      NetScore,
      NetScoreLatency,
      RampUp,
      RampUpLatency,
      Correctness,
      CorrectnessLatency,
      BusFactor,
      BusFactorLatency,
      PullRequest,
      PullRequestLatency,
      GoodPinningPractice,
      GoodPinningPracticeLatency,
      ResponsiveMaintainer,
      ResponsiveMaintainerLatency,
      LicenseScore,
      LicenseScoreLatency,
    };

    console.log("Metrics calculated:", data);
    return data;
  } catch (error: any) {
    console.error(`Error calculating metrics: ${error.message}`);
    // Throw a CustomError to ensure the function does not return undefined
    throw new CustomError(`Failed to calculate metrics: ${error.message}`, 500);
  }
}
