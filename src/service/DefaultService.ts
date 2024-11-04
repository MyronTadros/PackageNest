"use strict";

import { Request, Response, NextFunction, response } from "express";
import * as https from "https";
import awsSdk from "aws-sdk";
import axios from "axios";
import { executeSqlFile } from "../queries/resetDB";
import "dotenv/config";
import { getDbPool } from "./databaseConnection";
import * as packageQueries from "../queries/packageQueries";
import { calculateMetrics } from "../Metrics/metricExport";
import { CustomError } from "../utils/types";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  createUser,
  getAllUsers,
  getUserByUsername,
} from "../queries/userQueries";
import { v5 as uuidv5 } from 'uuid';
import { getPackageInfoZipFile, getPackageInfoRepo } from "../utils/retrievePackageJson";

const bucketName = process.env.S3_BUCKET_NAME;
const s3 = new awsSdk.S3();

/**
 * Types
 */
export interface PackagesListResponse {
  packages: Package[];
  nextOffset: number | null;
}

export interface AuthenticationRequest {
  User: {
    name: string;
    isAdmin: boolean;
    isBackend: boolean;
  };
  Secret: {
    password: string;
  };
}

export interface AuthenticationToken {
  token: string;
}

export interface PackageName {
  name: string;
}

export interface PackageRegEx {
  RegEx: string;
}

export interface PackageID {
  id: string;
}

export interface PackageMetadata {
  Version: string;
  ID: string;
  Name: string;
}

export interface Package {
  metadata: PackageMetadata;
  data: {
    Content: string;
    debloat: boolean;
    JSProgram: string;
    URL: string;
  };
}

export interface PackageCost {
  standaloneCost: number;
  totalCost: number;
}

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

export interface PackageQuery {
  Version: string;
  ID: string;
  Name: string;
}

export function registerUser(body: AuthenticationRequest): Promise<void> {
  return new Promise(async function (resolve, reject) {
    if (body) {
      const user = body.User;
      const secret = body.Secret.password;
      const hashedPassword = await bcrypt.hash(secret, 10);

      try {
        await createUser(
          user.name,
          hashedPassword,
          user.isAdmin,
          user.isBackend
        );
        resolve();
      } catch (error) {
        console.error("Error occurred in registerUser:", error);
        if (error instanceof CustomError)
          reject(
            new CustomError(`Failed to register user: ${error.message}`, 500)
          );
        else reject(new CustomError(`Failed to register user`, 500));
      }
    } else {
      reject(
        new CustomError("Missing required properties 'User' or 'Password'", 400)
      );
    }
  });
}

export function getUsers(): Promise<any> {
  return new Promise(async function (resolve, reject) {
    try {
      const result = await getAllUsers();
      resolve(result);
    } catch (error) {
      console.error("Error occurred in getAllUsers:", error);
      reject(new CustomError(`Failed to retrieve users`, 500));
    }
  });
}

/**
 * (NON-BASELINE)
 * Create an access token.
 *
 * @param body AuthenticationRequest
 * @returns Promise<AuthenticationToken>
 */
export function createAuthToken(
  body: AuthenticationRequest
): Promise<AuthenticationToken> {
  return new Promise(async function (resolve, reject) {
    console.log("Entered createAuthToken function with body:", body);
    if (body.User && body.User.name && body.Secret && body.Secret.password) {
      const foundUser = await getUserByUsername(body.User.name);
      if (foundUser) {
        const validPassword = await bcrypt.compare(
          body.Secret.password,
          foundUser.password_hash
        );
        if (validPassword) {
          const token = jwt.sign(
            {
              name: body.User.name,
              isAdmin: body.User.isAdmin,
              isBackend: body.User.isBackend,
            },
            process.env.JWT_SECRET ?? "defaultSecret",
            {
              expiresIn: "10h",
            }
          );
          resolve({ token: token });
        } else {
          reject(new CustomError("Invalid password", 401));
        }
      } else {
        reject(new CustomError("User not found", 404));
      }
    } else {
      reject(
        new CustomError("Missing required properties 'User' or 'Password'", 400)
      );
    }
  });
}

/*
Test body:
{
  "User": {
    "name": "ece30861defaultadminuser",
    "isAdmin": true
  },
  "Secret": {
    "password": "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;"
  }
}
*/

/**
 * (NON-BASELINE)
 * Return the history of this package (all versions).
 *
 * @param name PackageName
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export function packageByNameGet(
  name: PackageName,
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  return new Promise(function (resolve) {
    const examples: { [key: string]: Array<any> } = {
      "application/json": [
        {
          Action: "CREATE",
          User: {
            name: "Alfalfa",
            isAdmin: true,
          },
          PackageMetadata: {
            Version: "1.2.3",
            ID: "123567192081501",
            Name: "Name",
          },
          Date: "2023-03-23T23:11:15Z",
        },
        {
          Action: "CREATE",
          User: {
            name: "Alfalfa",
            isAdmin: true,
          },
          PackageMetadata: {
            Version: "1.2.3",
            ID: "123567192081501",
            Name: "Name",
          },
          Date: "2023-03-23T23:11:15Z",
        },
      ],
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (BASELINE)
 * Search for a package using a regular expression over package names and READMEs.
 *
 * @param body PackageQuery
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export async function packageByRegExGet(
  body: PackageRegEx,
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  console.log("Entered packageByRegExGet function");
  console.log("Received body:", JSON.stringify(body));
  console.log("Received xAuthorization:", xAuthorization);

  if (!body || !body.RegEx) {
    console.error("Invalid request body: 'RegEx' is required.");
    throw new CustomError("Invalid request body. 'RegEx' is required.", 400);
  }

  try {
    // Perform a query to retrieve packages whose names match the regular expression
    const regexQuery = `
      SELECT name AS Name, version AS Version, package_id AS ID
      FROM public.packages
      WHERE name ~ $1
    `;
    const regexValues = [body.RegEx];

    //  const packageData = await getDbPool().query(insertPackageQuery, [packageName, packageVersion, packageId, false]);

    const result = await getDbPool().query(regexQuery, regexValues);

    if (result.rows.length === 0) {
      console.log("No packages matched the provided regular expression.");
      return [];
    }

    // Prepare the result list in the specified format
    const response = result.rows.map((row) => ({
      Name: row.name,
      Version: row.version,
      ID: row.package_id,
    }));

    console.log("Returning matched packages:", JSON.stringify(response));
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageByRegExGet:", error);
    throw new CustomError(`Failed to retrieve packages: ${error.message}`, 500);
  }
}

/**
 * (BASELINE)
 * Upload or Ingest a new package.
 *
 * @param body Package
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Package>
 */
export async function packageCreate(
  Content?: string,
  JSProgram?: string,
  URL?: string,
  debloat?: boolean,
  Name?: string,
  metadata?: {
    Version?: string;
    ID?: string;
    Name?: string;
  },
  xAuthorization?: AuthenticationToken) {
  
  let packageName: string | undefined = metadata?.Name?.trim();
  let packageVersion: string | undefined = metadata?.Version?.trim();
  let packageId: string | undefined = metadata?.ID?.trim();
  let contentBuffer: string | undefined = undefined;
  let returnString: string | undefined = undefined;
  let repoOwner: string | undefined = undefined;
  let repoName: string | undefined = undefined;
  let debloatVal: boolean = debloat ?? false;
  console.log("Received xAuthorization:", xAuthorization);

  if (!packageVersion) {
    console.log("Version is not provided, setting to default 1.0.0");
    packageVersion = "1.0.0";
  }

  if ((!URL && !Content) || (URL && Content)) {
    console.error("Invalid request body: 'Content' or 'URL' (exclusively) is required.");
    throw new CustomError("Invalid request body. 'Content' or 'URL' (exclusively) is required.", 400);
  }
  else {
    if (!packageName && !Name) {
      console.log("Name is not in neither metadata or body, getting it from the URL or package json.");
      if (URL) {
        const repoMatch = URL.match(/github\.com\/([^/]+)\/([^/]+)(?:\/blob\/([^/]+)\/(.+))?/);
        if (!repoMatch) throw new CustomError("Invalid GitHub URL format", 400);
        repoOwner = repoMatch[1];
        repoName = repoMatch[2];
        try {
          const responseInfo = await getPackageInfoRepo(repoOwner, repoName);
          packageName = responseInfo?.name;
          packageVersion = responseInfo?.version;
        }
        catch (error: any) {
          console.error("Error occurred in retrieving info from package json using URL", error);
          throw new CustomError(`Failed to retrieve package info from package json using URL`, 500);
        }
      }
      else if (Content) {
        try {
          const responseInfo = await getPackageInfoZipFile(Content);
          packageName = responseInfo.name;
          packageVersion = responseInfo.version;
        }
        catch (error: any) {
          console.error("Error occurred in retrieving info from package json:", error);
          throw new CustomError(`Failed to retrieve package info from package json`, 500);
        }
      }
    }
    
    else if (Name) {
      console.log("name is provided in body, using that instead of metadata, or package json.");
      packageName = Name.trim();
    }

    const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

    if (!packageId || packageId !== uuidv5(`${packageName}-${packageVersion}`, NAMESPACE)) {
      console.log("packageId is not provided or does not match the UUIDv5 of the packageName and packageVersion, regenerating.");
      packageId = uuidv5(`${packageName}-${packageVersion}`, NAMESPACE);
    }


    if (!bucketName) {
      console.error(
        "S3_BUCKET_NAME is not defined in the environment variables."
      );
      throw new CustomError(
        "S3_BUCKET_NAME is not defined in the environment variables.",
        500
      );
    }

    if (await packageQueries.packageExistsQuery(packageId)) {
      console.error("Package already exists with ID:", packageId);
      throw new CustomError("Package already exists.", 409);
    }

    if (Content && !URL) {
      returnString = Content;
      console.log("Entered packageCreate service function with Content");
      console.log("Received body:", JSON.stringify({ Content: `${Content}`, URL: `${URL}`, debloat: `${debloatVal}`, JSProgram: `${JSProgram ?? null}` }));

      const s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;

      const s3Params = {
        Bucket: bucketName,
        Key: s3Key,
        Body: Buffer.from(Content, "base64"),
        ContentType: "application/zip",
      };
      try {
        console.log("Uploading package to S3 with key:", s3Key);
        await s3.putObject(s3Params).promise();
      } catch (error) {
        console.error("Error occurred in packageCreate:", error);
        throw new CustomError(`Failed to upload content`, 500);
      }
    } else if (URL && !Content) {
      console.log("Entered packageCreate service function with URL");
      console.log("Received body:", JSON.stringify({ URL: `${URL}`, debloat: `${debloatVal}`, JSProgram: `${JSProgram ?? null}` }));

      // RATE

      const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/zipball`;

      try {
        console.log(`Downloading file from URL: ${apiUrl}`);
        contentBuffer = await downloadFile(apiUrl);
        returnString = btoa(contentBuffer);
        const s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;
        // Upload the downloaded file as a zip to S3
        const s3Params = {
          Bucket: bucketName,
          Key: s3Key,
          Body: Buffer.from(contentBuffer, 'base64'),
          ContentType: "application/zip",
        };

        console.log("Uploading package from URL to S3 with key:", s3Key);
        await s3.putObject(s3Params).promise();
      } catch (error) {
        console.error("Error downloading or processing file from URL:", error);
        throw new CustomError(
          `Failed to download or upload package from URL`,
          500
        );
      }
    }

    try {
    
      if (!contentBuffer) //no url download, content type is true
        await packageQueries.insertPackageQuery(packageName, packageVersion ?? "1.0.0", packageId, true);
      else
        await packageQueries.insertPackageQuery(packageName, packageVersion ?? "1.0.0", packageId, false);
    
      await packageQueries.insertIntoMetadataQuery(packageName, packageVersion ?? "1.0.0", packageId);
    
      if (!contentBuffer)
        await packageQueries.insertIntoPackageDataQuery(packageId, true, URL, debloatVal, JSProgram);
      else
        await packageQueries.insertIntoPackageDataQuery(packageId, false, URL, debloatVal, JSProgram);

      console.log("Package and metadata, and data registered successfully.");

      const response = {
        metadata: {
          Name: packageName,
          Version: packageVersion,
          ID: packageId,
        },
        data: {
          Content: returnString,
          JSProgram: JSProgram,
        },
      };

      return response;
    } catch (error) {
      console.error("Error occurred in packageCreate:", error);
      throw new CustomError(
        `Failed to upload package or insert into database`,
        500
      );
    }
  }
}

async function downloadFile(url: string): Promise<string> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  });
   const base64Encoded = Buffer.from(response.data).toString("base64");
  return base64Encoded;
}

function sanitizeInput(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_\.]/g, "");
}

/* BASE INPUT: Put it as body in postman

{
  "metadata": {
    "Version": "1.0.0",
    "ID": "1234567890",
    "Name": "ExamplePackage"
  },
  "data": {
    "Content": "This is a sample content for the package.",
    "debloat": false,
    "JSProgram": "console.log('Hello World!');",
    "URL": "https://example.com/package/example.zip"
  }
}
  
*/

/**
 * (NON-BASELINE)
 * Delete a package that matches the ID.
 *
 * @param xAuthorization AuthenticationToken
 * @param id PackageID
 * @returns Promise<void>
 */
export function packageDelete(
  xAuthorization: AuthenticationToken,
  id: PackageID
): Promise<void> {
  return new Promise(function (resolve) {
    resolve();
  });
}

/**
 * (BASELINE)
 * Get the cost of a package.
 *
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @param dependency boolean (optional)
 * @returns Promise<PackageCost>
 */
export function packageIdCostGET(
  id: PackageID,
  xAuthorization: AuthenticationToken,
  dependency?: boolean
): Promise<PackageCost> {
  return new Promise(function (resolve) {
    const examples: { [key: string]: PackageCost } = {
      "application/json": {
        standaloneCost: 0.8008281904610115,
        totalCost: 6.027456183070403,
      },
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (BASELINE)
 * Get ratings for this package.
 *
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @returns Promise<PackageRating>
 */
export async function packageRate(
  id: PackageID,
  xAuthorization: AuthenticationToken
): Promise<PackageRating> {
  /* return new Promise(function(resolve) {
    const examples: { [key: string]: PackageRating } = {
      "application/json": {
        GoodPinningPractice: 4.145608029883936,
        CorrectnessLatency: 5.962133916683182,
        PullRequestLatency: 1.0246457001441578,
        RampUpLatency: 2.3021358869347655,
        PullRequest: 1.2315135367772556,
        LicenseScore: 3.616076749251911,
        BusFactorLatency: 6.027456183070403,
        LicenseScoreLatency: 2.027123023002322,
        GoodPinningPracticeLatency: 7.386281948385884,
        Correctness: 1.4658129805029452,
        ResponsiveMaintainerLatency: 9.301444243932576,
        NetScoreLatency: 6.84685269835264,
        NetScore: 1.4894159098541704,
        ResponsiveMaintainer: 7.061401241503109,
        RampUp: 5.637376656633329,
        BusFactor: 0.8008281904610115,
      },
    };
    resolve(examples['application/json']);
  }); */
  const testOutput: any = await calculateMetrics("");
  let response: PackageRating = {
    GoodPinningPractice: 0,
    CorrectnessLatency: 0,
    PullRequestLatency: 0,
    RampUpLatency: 0,
    PullRequest: 0,
    LicenseScore: 0,
    BusFactorLatency: 0,
    LicenseScoreLatency: 0,
    GoodPinningPracticeLatency: 0,
    Correctness: 0,
    ResponsiveMaintainerLatency: 0,
    NetScoreLatency: 0,
    NetScore: 0,
    ResponsiveMaintainer: 0,
    RampUp: 0,
    BusFactor: 0,
  };
  response.BusFactor = testOutput.BusFactor;
  response.Correctness = testOutput.Correctness;
  response.GoodPinningPractice = testOutput.GoodPinningPractice;
  response.LicenseScore = testOutput.LicenseScore;
  response.NetScore = testOutput.NetScore;
  response.PullRequest = testOutput.PullRequest;
  response.RampUp = testOutput.RampUp;
  response.ResponsiveMaintainer = testOutput.ResponsiveMaintainer;
  response.BusFactorLatency = testOutput.BusFactor_Latency;
  response.CorrectnessLatency = testOutput.Correctness_Latency;
  response.GoodPinningPracticeLatency = testOutput.GoodPinningPracticeLatency;
  response.LicenseScoreLatency = testOutput.LicenseScore_Latency;
  response.NetScoreLatency = testOutput.NetScore_Latency;
  response.PullRequestLatency = testOutput.PullRequest_Latency;
  response.RampUpLatency = testOutput.RampUp_Latency;
  response.ResponsiveMaintainerLatency =
    testOutput.ResponsiveMaintainer_Latency;
  return Promise.resolve(response);
}

/**
 * (BASELINE)
 * Return this package.
 *
 * @param xAuthorization AuthenticationToken
 * @param id PackageID
 * @returns Promise<Package>
 */
export async function packageRetrieve(
  xAuthorization: AuthenticationToken,
  id: string
) {
  console.log("Entered packageRetrieve function with ID:", id);
  console.log("Received xAuthorization:", xAuthorization);

  if (!bucketName) {
    console.error(
      "S3_BUCKET_NAME is not defined in the environment variables."
    );
    throw new CustomError(
      "S3_BUCKET_NAME is not defined in the environment variables.",
      500
    );
  }

  try {
    // Retrieve package metadata from the packages and package_data tables using the provided ID
    const metadataQuery = `
      SELECT p.name as packageName, p.version as packageVersion, p.package_id as packageId,
             pd.url as packageURL, pd.js_program as packageJS, p.content_type
      FROM public.packages AS p
      JOIN public.package_data AS pd ON p.package_id = pd.package_id
      WHERE p.package_id = $1
    `;
    const metadataValues = [id];

    const metadataResult = await getDbPool().query(
      metadataQuery,
      metadataValues
    );
    const metadata = metadataResult.rows[0];

    if (!metadata) {
      console.error("Package not found with ID:", id);
      throw new CustomError("Package not found.", 404);
    }

    console.log("Metadata of the query: ", metadata);

    // Construct the S3 key to retrieve the zip file based on package_id
    //const s3Key = `packages/${packageId}/v${packageVersion}/package.zip`;
    const s3Key = `packages/${metadata.packageid}/v${metadata.packageversion}/package.zip`;
    const s3Params = {
      Bucket: bucketName,
      Key: s3Key,
    };

    // Fetch the package content from S3
    console.log("Fetching package content from S3 with key:", s3Key);
    const s3Object = await s3.getObject(s3Params).promise();
    const content = s3Object.Body ? s3Object.Body.toString("base64") : null;

    if (!content) {
      console.error(
        "Failed to retrieve package content from S3 for key:",
        s3Key
      );
      throw new CustomError("Package content not found in S3.", 404);
    }

    // Prepare response in the desired format
    const response = {
      metadata: {
        Name: metadata.packagename,
        Version: metadata.packageversion,
        ID: metadata.packageid,
      },
      data: {
        Content: content, // Base64 encoded zip content
        JSProgram: metadata.packagejs,
      },
    };

    console.log("Returning package data:", JSON.stringify(response));
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageRetrieve:", error);
    throw new CustomError(`Failed to retrieve package: ${error.message}`, 500);
  }
}

/**
 * (BASELINE)
 * Update the content of the package.
 *
 * @param body Package
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @returns Promise<void>
 */
export function packageUpdate(
  body: Package,
  id: PackageID,
  xAuthorization: AuthenticationToken
): Promise<void> {
  return new Promise(function (resolve) {
    resolve();
  });
}

/**
 * (BASELINE)
 * Get the packages from the registry.
 *
 * @param body Array<PackageQuery>
 * @param offset string (optional)
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<PackageQuery>>
 */
export async function packagesList(
  body: PackageQuery[],
  offset?: string,
  xAuthorization?: AuthenticationToken
): Promise<PackagesListResponse> {
  console.log("Entered packagesList service function");
  console.log("Received body:", JSON.stringify(body));
  console.log("Received offset:", offset);
  console.log("Received xAuthorization:", xAuthorization);

  const limit = 10; // Number of items per page
  const offsetValue = offset ? parseInt(offset, 10) : 0;

  try {
    let queryParams: any[] = [];
    let whereClauses: string[] = [];

    if (body && body.length > 0) {
      // Handle special case: Name is "*"
      if (body.length === 1 && body[0].Name === "*") {
        // No where clause, select all packages
        console.log("Selecting all packages");
      } else {
        let queryIndex = 1;
        let packageConditions: string[] = [];

        for (const pkgQuery of body) {
          let conditions: string[] = [];
          const queryValues: any[] = [];

          // Ensure only one Version format per query
          if (pkgQuery.Version) {
            const versionFormats = [
              /^\d+\.\d+\.\d+$/, // Exact version
              /^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/, // Bounded range
              /^\^\d+\.\d+\.\d+$/, // Carat notation
              /^~\d+\.\d+\.\d+$/, // Tilde notation
            ];
            const matches = versionFormats.filter((regex) =>
              regex.test(pkgQuery.Version)
            );
            if (matches.length !== 1) {
              throw new CustomError(
                `Invalid or ambiguous version format: ${pkgQuery.Version}`,
                400
              );
            }
          }

          // Handle Name
          if (pkgQuery.Name) {
            conditions.push(`name = $${queryIndex}`);
            queryValues.push(pkgQuery.Name);
            queryIndex++;
          }

          // Handle ID
          if (pkgQuery.ID) {
            conditions.push(`id = $${queryIndex}`);
            queryValues.push(pkgQuery.ID);
            queryIndex++;
          }

          // Handle Version
          if (pkgQuery.Version) {
            const version = pkgQuery.Version.trim();

            if (/^\d+\.\d+\.\d+$/.test(version)) {
              // Exact version
              conditions.push(`version = $${queryIndex}`);
              queryValues.push(version);
              queryIndex++;
            } else if (/^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/.test(version)) {
              // Bounded range
              const [startVersion, endVersion] = version.split("-");
              conditions.push(
                `version >= $${queryIndex} AND version <= $${queryIndex + 1}`
              );
              queryValues.push(startVersion, endVersion);
              queryIndex += 2;
            } else if (/^\^\d+\.\d+\.\d+$/.test(version)) {
              // Carat notation
              const baseVersion = version.substring(1);
              const [major] = baseVersion.split(".");
              conditions.push(`version LIKE $${queryIndex}`);
              queryValues.push(`${major}.%`);
              queryIndex++;
            } else if (/^~\d+\.\d+\.\d+$/.test(version)) {
              // Tilde notation
              const baseVersion = version.substring(1);
              const [major, minor] = baseVersion.split(".");
              conditions.push(`version LIKE $${queryIndex}`);
              queryValues.push(`${major}.${minor}.%`);
              queryIndex++;
            } else {
              throw new CustomError(`Invalid version format: ${version}`, 400);
            }
          }

          if (conditions.length > 0) {
            const conditionString = conditions.join(" AND ");
            packageConditions.push(`(${conditionString})`);
            queryParams.push(...queryValues);
          }
        }

        if (packageConditions.length > 0) {
          whereClauses.push(packageConditions.join(" OR "));
        }
      }
    }

    // Prepare query conditions and parameters
    const packages = await packageQueries.getPackages(
      whereClauses,
      queryParams,
      limit,
      offsetValue
    );

    // Determine if there is a next page
    const nextOffset = packages.length === limit ? offsetValue + limit : null;

    return {
      packages,
      nextOffset,
    };
  } catch (error) {
    if (error instanceof CustomError) {
      console.error("Error in packagesList:", error.message);
      throw error;
    } else {
      console.error("Unexpected error in packagesList:", error);
      throw new CustomError("An unexpected error occurred.", 500);
    }
  }
}
/*
Test input:
[
  {
    "Name": "Underscore",
    "Version": "1.2.3"
  },
  {
    "Name": "Lodash",
    "Version": "1.2.3-2.1.0"
  },
  {
    "Name": "React",
    "Version": "^1.2.3"
  }
] 
*/

/**
 * (NON-BASELINE)
 * Resets the registry.
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<void>
 */
export async function registryReset(
  xAuthorization: AuthenticationToken
): Promise<void> {
  if (!bucketName) {
    throw new Error(
      "S3_BUCKET_NAME is not defined in the environment variables."
    );
  }

  console.log("Started registryReset");

  try {
    // Step 1: Delete all packages from the S3 `packages` folder
    console.log("Listing S3 objects in packages folder");
    const listParams = {
      Bucket: bucketName,
      Prefix: "packages/",
    };
    const listedObjects = await s3.listObjectsV2(listParams).promise();

    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      console.log("Deleting S3 objects in packages folder");
      const deleteParams = {
        Bucket: bucketName,
        Delete: {
          Objects: listedObjects.Contents.map((item) => ({ Key: item.Key! })),
        },
      };
      await s3.deleteObjects(deleteParams).promise();
      console.log("All S3 packages deleted successfully");
    } else {
      console.log("No objects to delete in the S3 packages folder");
    }

    // Step 2: Reset RDS database

    await executeSqlFile();
  } catch (error: any) {
    console.error("Error occurred during registry reset:", error);
    throw new Error(`Failed to reset registry: ${error.message}`);
  }
}

/**
 * (NON-BASELINE)
 * Returns an array of track objects.
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export function tracksGET(
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  return new Promise<Array<any>>((resolve) => {
    const examples: { [key: string]: Array<any> } = {
      "application/json": [
        {
          Version: "1.2.3",
          ID: "123567192081501",
          Name: "Name",
        },
        {
          Version: "1.2.3",
          ID: "123567192081501",
          Name: "Name",
        },
      ],
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (NON-BASELINE)
 * Testing
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export function testGET(
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  return new Promise<Array<any>>((resolve) => {
    const examples: { [key: string]: Array<any> } = {
      "application/json": [
        {
          Version: "1.2.3",
          ID: "testing",
          Name: "Name",
        },
        {
          Version: "1.2.3",
          ID: "aaaaaaaa",
          Name: "Name",
        },
      ],
    };
    resolve(examples["application/json"]);
  });
}
