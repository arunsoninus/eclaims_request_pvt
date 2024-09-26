sap.ui.define([],
	function () {

		return {
			getRandomNumber: function () {
				return Math.floor(Math.random() * Math.floor(5));
			},
			taskOperations: {},
			gwTaskOperations: {},
			sfOperations: {},
			processOperations: {},
			dbOperations: {
				// eclaimAuthToken: "/tokenauthorize?username=",
				eclaimAuthToken: "/tokenauthorize",
				userDetails: "/rest/utils/getUserDetails",
				fetchPhotoUser: "/rest/photo/api",
				fetchFilterLookup: "/rest/eclaims/filter",
				taskProcessHistory: "/rest/inbox/getProcessTrackerDetails?draftId=",
				metadataClaims: "/odata/eclaims",
				eclaimRequestViewCount: "/EclaimRequestViews/$count",
				taskActionConfigView: "/EclaimRequestViews/$count",
				statusConfig: "/StatusConfigs",
				chrsJobInfo: "/ChrsJobInfos",
				fetchClaimType: "/rest/eclaims/fetchClaimTypes?staffId=",
				caStaffLookUp: "/rest/eclaims/caStaffLookup",
				fetchDraftClaim: "/rest/eclaims/draftEclaimData",
				postClaim: "/rest/eclaims/singleRequest",
				requestLock: "/rest/eclaims/requestLock",
				checkWbs: "/rest/eclaims/ecpwbsvalidate",
				fetchWbs: "/rest/eclaims/fetchWBS",
				deleteClaim: "/rest/eclaims/delete/claimRequest",
				uploadAttachment: "/rest/attachments/uploadAttachment",
				deleteAttachment: "/rest/attachments/deleteAttachment",
				fetchAttachment: "/rest/attachments/fetchAttachment",
				claimantStaffInfo: "/rest/eclaims/claimantStaffInfo",
				validateClaim: "/rest/eclaims/validateEclaims",
				fetchChrsHolidays:"/NusChrsHolidays"
			}

		};
	});