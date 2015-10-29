﻿//---------------------------------------------------------------------
// <copyright file="GitFolderManager.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// TypeScript class that creates a Git folder after the user hits create.
// </summary>

//---------------------------------------------------------------------

class GitFolderManager extends FolderManager implements IFolderManager {

    constructor(actionContext) {
        super(actionContext);
    }

    private getCommitData(branchName: string, oldCommitId: string, basePath: string, folderName: string, placeHolderFileName: string, comment: string) {
        return {
            refUpdates: [
                {
                    name: "refs/heads/" + branchName,
                    oldObjectId: oldCommitId
                }
            ],
            commits: [
                {
                    comment: comment,
                    changes: [
                        {
                            changeType: "add",
                            item: {
                                path: basePath + "/" + folderName + "/" + placeHolderFileName
                            },
                            newContent: {
                                content: "Git placeholder file",
                                contentType: "rawtext"
                            }
                        }
                    ]
                }
            ]
        }
    }

    public dialogCallback: (result: IFormInput) => void = (result) => {
        var self = this;

        var actionContext = self.actionContext;


        var folderName = result.folderName;
        var placeHolderFileName = result.placeHolderFileName;
        var repositoryId = actionContext.gitRepository.id;
        var branchName = actionContext.version;
        var basePath = self.actionContext.item ? self.actionContext.item.path : "";
        var comment = result.comment;

        VSS.require(["VSS/Service", "TFS/VersionControl/GitRestClient", "TFS/VersionControl/Contracts"], (Service, RestClient, Contracts) => {
            var gitClient = Service.getClient(RestClient.GitHttpClient);

            gitClient.getItems(repositoryId, undefined, basePath, Contracts.VersionControlRecursionType.Full, true, undefined, undefined, undefined, undefined).then(
                function (result) {
                    // check and see if the folder already exists
                    var folderPath = basePath ? basePath + "/" + folderName : folderName;
                    for (var i = 0; i < result.length; i++) {
                        var current = result[i];
                        if (current.isFolder && current.path.indexOf(folderPath) === 0) {
                            return;
                        }
                    }

                    // folder doesn't exist, create it
                    gitClient.getCommits(repositoryId, { $top: 1 }, undefined, undefined, undefined).then(
                        function (commits) {
                            var oldCommitId = commits[0].commitId

                            var data = self.getCommitData(branchName, oldCommitId, basePath, folderName, placeHolderFileName, comment);

                            gitClient.createPush(data, repositoryId, undefined).then(

                                function () {
                                    self.refreshBrowserWindow();
                                },
                                function (x, y, z) {

                                }
                                );
                        });

                });
        });

    }
}