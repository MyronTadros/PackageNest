import { getDbPool } from "../service/databaseConnection";
import { Package, PackageQuery } from "../service/DefaultService";

export async function getPackages(
  conditions: string[],
  queryParams: any[],
  limit: number,
  offset: number
): Promise<Package[]> {
  const pool = getDbPool();
  let queryText = `SELECT * FROM public."packages"`;

  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(" AND ")}`;
  }

  queryText += ` ORDER BY id LIMIT $${queryParams.length + 1} OFFSET $${
    queryParams.length + 2
  }`;
  const finalQueryParams = [...queryParams, limit, offset];

  console.log("Executing query:", queryText);
  console.log("With parameters:", finalQueryParams);

  const result = await pool.query(queryText, finalQueryParams);
  return result.rows;
}

// Retrieve a package by ID
const getPackageById = async (packageId: number) => {
  const query = `SELECT * FROM public."packages" WHERE id = $1`;
  try {
    const res = await getDbPool().query(query, [packageId]);
    return res.rows[0];
  } catch (error) {
    console.error("Error fetching package by ID:", error);
    throw error;
  }
};

// Insert a package into RDS
export const insertPackage = async (
  packageName: string,
  packageVersion: string,
  score: number = 0.25
) => {
  const query = `INSERT INTO public."packages" (name, version, score) VALUES ($1, $2, $3) RETURNING id;`; // Change public."packages" to the tables you will insert into
  try {
    const res = await getDbPool().query(query, [
      packageName,
      packageVersion,
      score,
    ]);
    return res.rows[0].id;
  } catch (error) {
    console.error("Error inserting package:", error);
    throw error;
  }
};

// Retrieve a package by name
export const getPackageByName = async (name: string) => {
    const query = `SELECT * FROM public."packages" WHERE name = $1;`;
    try {
      const res = await getDbPool().query(query, [name]);
      return res.rows[0];
    } catch (error) {
      console.error("Error fetching package by name:", error);
      throw error;
    }
  };
  
// Package version update
export const updatePackageVersion = async (name: string, version: string) => {
    const query = `UPDATE public."packages" SET version = $1, updated_at = NOW() WHERE id = $2;`;
    try {
      await getDbPool().query(query, [version, name]);
    } catch (error) {
      console.error("Error updating package version:", error);
      throw error;
    }
};


export const insertPackageRating = async (packageId: number, busFactor: number, correctness: number, rampUp: number, licenseScore: number) => {
    const query = `INSERT INTO public."package_ratings" (package_id, bus_factor, correctness, ramp_up, license_score)
                   VALUES ($1, $2, $3, $4, $5);`;
    try {
        await getDbPool().query(query,[packageId, busFactor, correctness, rampUp, licenseScore]);

    } catch (error) {
        console.error("Error inserting package Rating intoo packages: ", error);
    }
};

