export interface RunSetupOpts {
  printOnly: boolean;
}

export async function runSetup(_opts: RunSetupOpts): Promise<void> {
  throw new Error("setup wizard not yet implemented");
}
