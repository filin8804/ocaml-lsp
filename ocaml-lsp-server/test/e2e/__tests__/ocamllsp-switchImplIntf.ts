import { assert } from "console";
import { promises as fs } from "fs";
import * as path from "path";
import { DocumentUri, TextDocumentItem } from "vscode-languageserver-types";
import { URI } from "vscode-uri";
import * as LanguageServer from "./../src/LanguageServer";

describe("ocamllsp/switchImplIntf", () => {
  let languageServer: LanguageServer.LanguageServer = null;

  async function openDocument(documentUri: DocumentUri) {
    languageServer.sendNotification("textDocument/didOpen", {
      textDocument: TextDocumentItem.create(documentUri, "ocaml", 0, ""),
    });
  }

  /* sends request "ocamllsp/switchImplIntf" */
  async function ocamllspSwitchImplIntf(
    documentUri: DocumentUri,
  ): Promise<Array<DocumentUri>> {
    return languageServer.sendRequest("ocamllsp/switchImplIntf", documentUri);
  }

  let testWorkspacePath = path.join(__dirname, "..", "test_files/");

  beforeEach(async () => {
    languageServer = await LanguageServer.startAndInitialize();
    await fs.rmdir(testWorkspacePath, { recursive: true });
    fs.mkdir(testWorkspacePath);
  });

  afterEach(async () => {
    await fs.rmdir(testWorkspacePath, { recursive: true });
    await LanguageServer.exit(languageServer);
    languageServer = null;
  });

  let createPathForFile = (filename: string) =>
    path.join(testWorkspacePath, filename);

  let createFileAtPath = async (path: string) =>
    fs.writeFile(path, "", { flag: "a+" });

  let pathToDocumentUri = (path: string): DocumentUri =>
    URI.file(path).toString();

  let [mli, ml, mll, mly, rei, re] = ["mli", "ml", "mll", "mly", "rei", "re"];

  let testRequest = async (
    requestParam: DocumentUri,
    expectedResponse: DocumentUri[],
  ) => {
    let response = await ocamllspSwitchImplIntf(requestParam);
    expect(response).toEqual(expectedResponse);
  };

  /**
   * For testing 'ocamllsp/switchImplIntf'
   *
   * @param extsForCreation file name extension for files to be created in
   *    (test) workspace folder. The first file created (even if only one file
   *    is created) is treated as the file a user wants to switch from.
   * @param extExpected file name extensions that are expected to be returned as
   *    a reponse to 'ocamllsp/switchImplIntf'
   */
  let testingPipeline = async (
    extsForCreation: string[],
    extExpected: string[],
  ) => {
    assert(
      extsForCreation.length > 0,
      "extensions for creation should not be empty",
    );
    assert(
      extExpected.length > 0,
      "expected response extensions should not be empty",
    );

    let filePathsForCreation = extsForCreation.map((ext) => {
      let filename = "test.".concat(ext);
      return createPathForFile(filename);
    });

    await Promise.all(filePathsForCreation.map(createFileAtPath));

    let filePathToSwitchFrom = filePathsForCreation[0];
    let fileURIToSwitchFrom = pathToDocumentUri(filePathToSwitchFrom);
    await openDocument(fileURIToSwitchFrom);

    let expectedFileURIs = extExpected.map((ext) => {
      let filename = "test.".concat(ext);
      let filePath = createPathForFile(filename);
      return pathToDocumentUri(filePath);
    });

    testRequest(fileURIToSwitchFrom, expectedFileURIs);
  };

  test.each([
    [[mli], [ml]],
    [[mli, ml], [ml]],
    [[ml], [mli]],
    [[ml, mli], [mli]],
    [
      [mli, ml, mll],
      [ml, mll],
    ],
  ])("test switches (%s => %s)", testingPipeline);
});
