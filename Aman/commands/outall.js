module.exports.config = {
	name: "outall",
	version: "1.0.1",
	hasPermssion: 2,
	credits: "Aman",
	description: "Leave all groups at once",
	commandCategory: "Admin",
	usages: "outall",
	cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
	try {
		const { threadID, messageID } = event;
		
		// Confirmation check
		if (!args[0] || args[0].toLowerCase() !== "confirm") {
			return api.sendMessage(
				"⚠️ **WARNING: This will leave ALL groups!**\n\n" +
				"🔹 Type: `/outall confirm` to proceed\n" +
				"🔹 This action cannot be undone\n" +
				"🔹 Bot will leave all groups except this one\n\n" +
				"❌ Use with caution!",
				threadID, messageID
			);
		}
		
		console.log("[OutAll] Starting group leave process...");
		api.sendMessage("🔄 Starting to leave all groups... Please wait...", threadID, messageID);
		
		// Get thread list with proper error handling
		api.getThreadList(100, null, ["INBOX"], async (err, list) => {
			if (err) {
				console.error("[OutAll] Error getting thread list:", err);
				return api.sendMessage("❌ Error: Unable to fetch group list!", threadID, messageID);
			}
			
			if (!list || !Array.isArray(list)) {
				return api.sendMessage("❌ Error: Invalid group list received!", threadID, messageID);
			}
			
			// Filter only groups (excluding current thread)
			const groupsToLeave = list.filter(item => 
				item.isGroup === true && 
				item.threadID !== threadID &&
				item.threadID !== event.threadID
			);
			
			if (groupsToLeave.length === 0) {
				return api.sendMessage("ℹ️ No groups found to leave!", threadID, messageID);
			}
			
			console.log(`[OutAll] Found ${groupsToLeave.length} groups to leave`);
			
			let successCount = 0;
			let errorCount = 0;
			const botID = api.getCurrentUserID();
			
			// Process groups with delay to avoid rate limiting
			for (let i = 0; i < groupsToLeave.length; i++) {
				const group = groupsToLeave[i];
				
				try {
					console.log(`[OutAll] Leaving group ${i + 1}/${groupsToLeave.length}: ${group.threadID}`);
					
					// Leave the group
					await new Promise((resolve, reject) => {
						api.removeUserFromGroup(botID, group.threadID, (err) => {
							if (err) {
								console.error(`[OutAll] Failed to leave ${group.threadID}:`, err);
								errorCount++;
								reject(err);
							} else {
								console.log(`[OutAll] Successfully left ${group.threadID}`);
								successCount++;
								resolve();
							}
						});
					});
					
					// Add delay to prevent rate limiting
					if (i < groupsToLeave.length - 1) {
						await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
					}
					
				} catch (error) {
					console.error(`[OutAll] Error leaving group ${group.threadID}:`, error);
					errorCount++;
				}
				
				// Send progress update every 10 groups
				if ((i + 1) % 10 === 0) {
					api.sendMessage(
						`📊 Progress: ${i + 1}/${groupsToLeave.length} groups processed\n` +
						`✅ Success: ${successCount}\n` +
						`❌ Errors: ${errorCount}`,
						threadID
					);
				}
			}
			
			// Send final summary
			const finalMessage = 
				`🎯 **OutAll Process Completed!**\n\n` +
				`📊 **Summary:**\n` +
				`🔹 Total Groups Found: ${groupsToLeave.length}\n` +
				`✅ Successfully Left: ${successCount}\n` +
				`❌ Failed to Leave: ${errorCount}\n\n` +
				`${successCount > 0 ? '✅ Bot has left all accessible groups!' : '❌ No groups were left successfully.'}`;
			
			api.sendMessage(finalMessage, threadID);
			console.log(`[OutAll] Process completed. Success: ${successCount}, Errors: ${errorCount}`);
		});
		
	} catch (error) {
		console.error("[OutAll] Main function error:", error);
		return api.sendMessage("❌ An unexpected error occurred!", event.threadID, event.messageID);
	}
};

// Alternative version with more safety checks
module.exports.runSafe = async ({ api, event, args }) => {
	try {
		const { threadID, messageID } = event;
		
		// Double confirmation for safety
		if (!args[0] || args[0].toLowerCase() !== "confirm") {
			return api.sendMessage(
				"⚠️ **DANGER: This will leave ALL groups!**\n\n" +
				"🚨 **Safety Warning:**\n" +
				"• Bot will leave ALL groups except this one\n" +
				"• This action is IRREVERSIBLE\n" +
				"• You'll need to re-add bot manually to each group\n\n" +
				"🔹 Type: `/outall confirm` only if you're absolutely sure\n\n" +
				"❌ **Think twice before proceeding!**",
				threadID, messageID
			);
		}
		
		// Get current user info for additional safety
		const botID = api.getCurrentUserID();
		console.log(`[OutAll] Bot ID: ${botID} starting group leave process`);
		
		return new Promise((resolve, reject) => {
			api.getThreadList(50, null, ["INBOX"], async (err, list) => {
				if (err) {
					console.error("[OutAll] Thread list error:", err);
					api.sendMessage("❌ Failed to fetch group list!", threadID);
					return reject(err);
				}
				
				// Filter and validate groups
				const validGroups = list.filter(item => {
					return (
						item && 
						item.isGroup === true && 
						item.threadID && 
						item.threadID !== threadID &&
						item.threadID.toString() !== threadID.toString()
					);
				});
				
				if (validGroups.length === 0) {
					api.sendMessage("ℹ️ No groups found to leave (or bot is only in this group).", threadID);
					return resolve();
				}
				
				api.sendMessage(
					`🎯 Found ${validGroups.length} groups to leave.\n` +
					`⏳ Starting process... This may take a while.`,
					threadID
				);
				
				let processed = 0;
				let successful = 0;
				
				// Process each group sequentially
				for (const group of validGroups) {
					try {
						await new Promise((resolveGroup, rejectGroup) => {
							setTimeout(() => {
								api.removeUserFromGroup(botID, group.threadID, (removeErr) => {
									processed++;
									if (removeErr) {
										console.error(`[OutAll] Error leaving ${group.threadID}:`, removeErr);
									} else {
										successful++;
										console.log(`[OutAll] Left group: ${group.threadID}`);
									}
									resolveGroup();
								});
							}, processed * 800); // 800ms delay between each
						});
						
					} catch (groupError) {
						console.error(`[OutAll] Group process error:`, groupError);
						processed++;
					}
				}
				
				// Wait for all to complete
				setTimeout(() => {
					const summary = 
						`✅ **Process Completed!**\n\n` +
						`📊 Groups Processed: ${processed}\n` +
						`✅ Successfully Left: ${successful}\n` +
						`❌ Failed: ${processed - successful}\n\n` +
						`🎉 Bot has left all accessible groups!`;
					
					api.sendMessage(summary, threadID);
					console.log(`[OutAll] Final stats - Processed: ${processed}, Successful: ${successful}`);
					resolve();
				}, (validGroups.length * 800) + 2000);
			});
		});
		
	} catch (error) {
		console.error("[OutAll] Main error:", error);
		api.sendMessage("❌ Critical error occurred during outall process!", event.threadID);
	}
};
