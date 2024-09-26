sap.ui.define(["sap/ui/core/ValueState"],
	function (ValueState) {
		return {

			attachmentIconSet: function (sType) {
				switch (sType) {
				case "jpg":
				case "jpeg":
				case "png":
					return "sap-icon://attachment-photo";
					break;
				case "pdf":
					return "sap-icon://pdf-attachment";
					break;
				case "xls":
				case "xlsx":
					return "sap-icon://excel-attachment";
					break;
				case "doc":
				case "docs":
					return "sap-icon://doc-attachment";
					break;
				case "ppt":
				case "pptx":
					return "sap-icon://ppt-attachment";
					break;
				case "txt":
					return "sap-icon://attachment-text-file";
					break;
				default:
					return "sap-icon://documents";
				}
			},

			formatCommentColour: function (sValue) {
				if (!sValue) {
					//return "#1B7CD1";
					return "#524e4e";
				} else {
					//    return "#1E6E33";
					return "#1e6e0a";
				}
			},

			formatDate: function (date) {
				if (date && date.indexOf("/Date") !== -1) {
					var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
						pattern: "dd/MM/yyyy"
					});
					date = oDateFormat.format(new Date(parseFloat(date.split("(")[1].split(")")[0])));
					return date;
				} else {
					return date;
				}
			},

			formatRowElement: function (rowElement) {
				var tempEntry = {};
				for (var key in rowElement) {
					if (rowElement.hasOwnProperty(key)) {
						tempEntry[this.removeUnwantedChars(key)] = (rowElement[key]) ? rowElement[key] : "";
					}
				}
				return tempEntry;
			},
			/**
			 * Remove Unwanted Characters from an attribute
			 */
			removeUnwantedChars: function (attr) {
				attr = (attr) ? attr : "";
				attr = attr.replace(" ", "").replace("\r", "").replace("\n", "").replace(/(<([^>]+)>)/ig, "").replace("&nbsp;", "");
				while (attr.indexOf(" ") > -1 || attr.indexOf("\r") > -1 || attr.indexOf("\n") > -1 ||
					attr.indexOf("-") > -1 || attr.indexOf(".") > -1 || attr.indexOf("/") > -1 || attr.indexOf("(") > -1 || attr.indexOf("%") > -1 ||
					attr.indexOf(")") > -1) {
					attr = attr.replace(" ", "").replace("\r", "").replace("\n", "").replace("-", "").replace(".", "").replace("/", "").replace("(",
						"").replace("%", "").replace(")", "");
				}

				return attr;
			},
			validateDataInModels: function (model, data) {
				var obj = (model) ? model.getData() : data;
				var isLoaded = (obj && Object.keys(obj).length > 0) ? true : false;
				return isLoaded;
			},
			/***
			 * Extract and Frame Task Context Data
			 */
			hexToBase64: function (str) {
				return btoa(String.fromCharCode.apply(null, str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(
					" ")));
			},
			/*
			 * Format Date as String
			 */
			formatDateAsString: function (dateValue, format, isYearFormat, localData) {
				var response = "";
				if (dateValue && dateValue !== "NA" && dateValue !== "/Date(0)/") {
					if (dateValue) {
						if (typeof (dateValue) === "string" && dateValue.indexOf("/Date") > -1) {
							dateValue = parseFloat(dateValue.substr(dateValue.lastIndexOf("(") + 1, dateValue.lastIndexOf(")") - 1));
						}
						dateValue = new Date(dateValue);
					}
					/*else {
						dateValue = new Date();
					}*/
					if (dateValue) {

						var yyyy = dateValue.getFullYear() + "";
						var tempDateStr = new Date().getFullYear();
						if (isYearFormat && isYearFormat != 'false' && (parseInt(yyyy) < tempDateStr)) {
							yyyy = tempDateStr.toString().substring(0, 2) + yyyy.substring(2, yyyy.length);
						}
						var mm = (dateValue.getMonth() + 1) + "";
						mm = (mm.length > 1) ? mm : "0" + mm;
						var dd = dateValue.getDate() + "";
						dd = (dd.length > 1) ? dd : "0" + dd;

						var hh, mins, secs;

						switch (format) {
						case "yyyyMMdd":
							response = yyyy + mm + dd;
							break;
						case "dd/MM/yyyy":
							response = dd + "/" + mm + "/" + yyyy;
							break;
						case "yyyy-MM-dd":
							response = yyyy + "-" + mm + "-" + dd;
							break;
						case "yyyy-dd-MM":
							response = yyyy + "-" + dd + "-" + mm;
							break;
						case "MM/dd/yyyy":
							response = mm + "/" + dd + "/" + yyyy;
							break;
						case "MM/yyyy":
							response = mm + "/" + yyyy;
							break;
						case "yyyy-MM-ddThh:MM:ss":
							hh = dateValue.getHours() + "";
							hh = (hh.length > 1) ? hh : "0" + hh;
							mins = dateValue.getMinutes() + "";
							mins = (mins.length > 1) ? mins : "0" + mins;
							secs = dateValue.getSeconds() + "";
							secs = (secs.length > 1) ? secs : "0" + secs;
							response = yyyy + "-" + mm + "-" + dd + "T" + hh + ":" + mins + ":" + secs;
							break;
						case "yyyy-MM-dd hh:MM:ss":
							hh = dateValue.getHours() + "";
							hh = (hh.length > 1) ? hh : "0" + hh;
							mins = dateValue.getMinutes() + "";
							mins = (mins.length > 1) ? mins : "0" + mins;
							secs = dateValue.getSeconds() + "";
							secs = (secs.length > 1) ? secs : "0" + secs;
							response = yyyy + "-" + mm + "-" + dd + " " + hh + ":" + mins + ":" + secs;
							break;
						case "hh:MM:ss":
							hh = dateValue.getHours() + "";
							hh = (hh.length > 1) ? hh : "0" + hh;
							mins = dateValue.getMinutes() + "";
							mins = (mins.length > 1) ? mins : "0" + mins;
							secs = dateValue.getSeconds() + "";
							secs = (secs.length > 1) ? secs : "0" + secs;
							response = hh + ":" + mins + ":" + secs;
							break;
						case "dd/MM/yyyy hh:MM:ss":
							response = dd + "/" + mm + "/" + yyyy + " ";
							hh = dateValue.getHours() + "";
							hh = (hh.length > 1) ? hh : "0" + hh;
							mins = dateValue.getMinutes() + "";
							mins = (mins.length > 1) ? mins : "0" + mins;
							secs = dateValue.getSeconds() + "";
							secs = (secs.length > 1) ? secs : "0" + secs;
							response += hh + ":" + mins + ":" + secs;
							break;
						case "dd/MM/yyyy hh:MM:ss aa":
							response = mm + "/" + dd + "/" + yyyy + " ";
							hh = dateValue.getHours();
							var ampm = (hh >= 12) ? 'PM' : 'AM';
							hh = hh % 12;
							hh = (hh ? (hh < 10 ? "0" + hh : hh) : 12);
							// hh = (hh.length > 1) ? hh : "0" + hh;
							mins = dateValue.getMinutes() + "";
							mins = (mins.length > 1) ? mins : "0" + mins;
							secs = dateValue.getSeconds() + "";
							secs = (secs.length > 1) ? secs : "0" + secs;
							response += hh + ":" + mins + ":" + secs + " " + ampm;
							break;
						case "dd Mmm,yyyy":
							response = mm + "/" + dd + "/" + yyyy + " ";
							mm = localData[Number(mm) - 1].substring(0, 3);
							hh = dateValue.getHours();
							var ampm = (hh >= 12) ? 'PM' : 'AM';
							hh = hh % 12;
							hh = (hh ? (hh < 10 ? "0" + hh : hh) : 12);
							// hh = (hh.length > 1) ? hh : "0" + hh;
							mins = dateValue.getMinutes() + "";
							mins = (mins.length > 1) ? mins : "0" + mins;
							secs = dateValue.getSeconds() + "";
							secs = (secs.length > 1) ? secs : "0" + secs;
							response = dd + " " + mm + "," + yyyy;
							break;
						case "dd Mmm, yyyy":
							response = mm + "/" + dd + "/" + yyyy + " ";
							mm = localData[Number(mm) - 1].substring(0, 3);
							hh = dateValue.getHours();
							var ampm = (hh >= 12) ? 'PM' : 'AM';
							hh = hh % 12;
							hh = (hh ? (hh < 10 ? "0" + hh : hh) : 12);
							// hh = (hh.length > 1) ? hh : "0" + hh;
							mins = dateValue.getMinutes() + "";
							mins = (mins.length > 1) ? mins : "0" + mins;
							secs = dateValue.getSeconds() + "";
							secs = (secs.length > 1) ? secs : "0" + secs;
							response = dd + " " + mm + ", " + yyyy;
							break;
						default:
							response = dateValue;
							break;
						}
					}
				}
				return response;
				//Format Year
			},

			// following function returns true if dateValue is in future else false
			_isFutureDate: function (dateValue) {
				if (dateValue) {
					if (this._getDiffWithCurrentTime(dateValue) > 0 && !this._isCurrentDate(
							dateValue)) {
						return true;
					}
				}
				return false;
			},
			// Compare two Date Values and return
			compareDates: function (date1, date2) {
				date1 = new Date(date1);
				date2 = new Date(date2);
				return (date1.getTime() === date2.getTime());
			},
			// following function returns difference in milliseconds between dateValue and current date
			_getDiffWithCurrentTime: function (dateValue) {
				var today = new Date();
				var deadline = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), 24, 00, 00);
				var diff = deadline.getTime() - (today.getTime());
				return diff;
			},
			_isCurrentDate: function (dateValue) {
				if (dateValue) {
					var oCurrentDate = new Date();
					if ((oCurrentDate.getDate() == dateValue.getDate()) && (oCurrentDate.getMonth() == dateValue.getMonth()) && (oCurrentDate.getYear() ==
							dateValue.getYear())) {
						return true;
					}
				}
			},

			parseObjectData: function (data) {
				if (data) {
					data = JSON.parse(JSON.stringify(data));
				}
				return data;
			},
			assignPropertiesToObjects: function (targetObj, sourceObj, isParse) {
				Object.assign(targetObj, sourceObj);
				return (isParse) ? this.parseObjectData(targetObj) : targetObj;
			},
			/**
			 * Calculate Hours based on Entered Start and End Time
			 */
			/*calculateHours: function (startTime, endTime) {
				var calculatedValue = "";
				if (endTime === "23:59") {
					endTime = "24:00";
				}
				if (startTime && endTime) {
					var start = startTime.split(":");
					var end = endTime.split(":");
					var startDate = new Date(0, 0, 0, start[0], start[1], 0);
					var endDate = new Date(0, 0, 0, end[0], end[1], 0);
					var diff = endDate.getTime() - startDate.getTime();
					var hours = Math.floor(diff / 1000 / 60 / 60);
					diff -= hours * 1000 * 60 * 60;
					// var minutes = Math.floor(diff / 1000 / 60);
					var minutes = (Math.abs(diff) / 36e5) * 100;
					//trying to restrict decimal places to 2

					var aMinutesDecPlaces = minutes.toString().split(".");

					if (aMinutesDecPlaces.length > 1) {
						//minutes = minutes.toFixed(1);
						minutes = parseFloat(minutes).toFixed(0);
					}

					calculatedValue = hours + "." + minutes;
				}
				return calculatedValue;
			},*/
			calculateHours: function (startTime, endTime) {
				var calculatedValue = "";
				var sec = 0;
				if (endTime === "23:59") {
					endTime = "24:00";
					// sec = "59";
				}
				if (startTime && endTime) {
					var start = startTime.split(":");
					var end = endTime.split(":");
					var startDate = new Date(0, 0, 0, start[0], start[1], 0);
					var endDate = new Date(0, 0, 0, end[0], end[1], sec);
					var diff = endDate.getTime() - startDate.getTime();
					var hoursact = diff / (1000 * 60 * 60);
					calculatedValue = hoursact.toFixed(2);
					// var hours = Math.floor(diff / 1000 / 60 / 60);
					// diff -= hours * 1000 * 60 * 60;
					// var minutes = (Math.abs(diff) / 36e5) * 100;
					// var aMinutesDecPlaces = minutes.toString().split(".");
					// if (aMinutesDecPlaces.length > 1) {
					// 	minutes = parseFloat(minutes).toFixed(0);
					// }
					// calculatedValue = hours + "." + minutes;
				}
				return calculatedValue;
			},

			removeLeadingZeroes: function (tempVal) {
				tempVal = (tempVal) ? tempVal + "" : "";
				tempVal = (tempVal) ? tempVal.replace(/^0+/, '') : tempVal;
				return tempVal;
			},
			convertToString: function (tempVal) {
				tempVal = (tempVal) ? (tempVal + "").trim() : "";
				return tempVal;
			},
			paddingWithLeadingZeroes: function (num, size) {
				var s = num + "";
				while (s.length < size) s = "0" + s;
				return s;
			},
			/**
			 * Formatter Method to fix the Decimal Places
			 */
			toFixed: function (num, fixed, isGstAmt) {
				fixed = fixed || 0;
				fixed = Math.pow(100, fixed);
				var value = Math.floor(num * fixed) / fixed;
				return isGstAmt ? (value + "") : (Number(value).toFixed(2));
			},
			getItemsMessageElement: function (messageList, itemNo, messageElement) {
				for (var i = 0; i < messageList.length; i++) {
					if (messageList[i].title === ("Item #" + itemNo)) {
						messageElement.index = (i + 1);
						messageElement.counter = messageList[i].counter;
						messageElement.description = messageList[i].description;
						messageElement.type = messageList[i].type;
						messageElement.active = messageList[i].active;
						// messageElement = messageList[i];;
					}
				}
			},
			getLastDay: function (y, m) {
				return new Date(y, m + 1, 0).getDate();
			},
			getColorScheme: function (statusCode) {
				return (statusCode === '01') ? true : false;
			},
			convertMonthcodeToName: function (month, year) {
				year = ' ' + year;
				if (month === '01') {
					month = 'Jan';
				} else if (month === '02') {
					month = 'Feb';
				} else if (month === '03') {
					month = 'Mar';
				} else if (month === '04') {
					month = 'Apr';
				} else if (month === '05') {
					month = 'May';
				} else if (month === '06') {
					month = 'Jun';
				} else if (month === '07') {
					month = 'Jul';
				} else if (month === '08') {
					month = 'Aug';
				} else if (month === '09') {
					month = 'Sep';
				} else if (month === '10') {
					month = 'Oct';
				} else if (month === '11') {
					month = 'Nov';
				} else if (month === '12') {
					month = 'Dec';
				}

				return [month, year];
				//	return year;
			},

			convertMonthcodeToPrevMonthCode: function (monthCode) {
				//	year = ' ' + year;
				if (monthCode === -1) {
					monthCode = 11;
				} else if (monthCode === -2) {
					monthCode = 10;
				} else if (monthCode === -3) {
					monthCode = 9;
				} else if (monthCode === -4) {
					monthCode = 8;
				} else if (monthCode === -5) {
					monthCode = 7;
				} else if (monthCode === -6) {
					monthCode = 6;
				} else if (monthCode === -7) {
					monthCode = 5;
				} else if (monthCode === -8) {
					monthCode = 4;
				} else if (monthCode === -9) {
					monthCode = 3;
				} else if (monthCode === -10) {
					monthCode = 2;
				} else if (monthCode === -11) {
					monthCode = 1;
				} else if (monthCode === -12) {
					monthCode = 0;
				}
				return monthCode;
				//	return year;
			},

			visibilityForClaimRequestType: function (userRole, massUploadRadioSelected, claimType) {

				var visibility = false;
				if ((claimType === '101' || claimType === '102' ||claimType === '103' || claimType === '104') && userRole === 'CA' && massUploadRadioSelected === false) {
					visibility = true;
				}
				return visibility;
			},

			visibilityForUnLockButton: function (lockedByStaffId, loggedInUserStaffId) {

				var visibility = false;
				if (lockedByStaffId === loggedInUserStaffId) {
					visibility = true;
				}
				return visibility;
			}
		};
	});