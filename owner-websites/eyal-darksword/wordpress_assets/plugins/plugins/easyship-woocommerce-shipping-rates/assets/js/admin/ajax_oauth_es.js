jQuery(function () {
	const connect_button = jQuery("#woocommerce_easyship_connect_to_easyship");
	const access_token_field = jQuery("#woocommerce_easyship_api_access_token");

	connect_button.click((e) => {
		e.preventDefault();

		const msg_connected =
			easyship_ajax_action_params.msg__already_connected_are_you_sure;

		if (access_token_field.val() && !confirm(msg_connected)) {
			return;
		}

		// Pre-open a tab *synchronously* here - allowed by popup blockers
		const new_tab = window.open("", "_blank");
		const has_opened_new_tab = new_tab !== null;

		if (has_opened_new_tab) {
			connect_button.prop("disabled", true);

			const doc = new_tab.document;
			// Reset the document explicitly
			doc.open();
			doc.close();

			doc.title = "Easyship - Connecting...";

			const container = doc.createElement("div");
			container.style.display = "flex";
			container.style.flexDirection = "column";
			container.style.justifyContent = "center";
			container.style.alignItems = "center";
			container.style.height = "100vh";
			container.style.fontFamily = "sans-serif";
			container.innerHTML = `
				<div style="border: 6px solid #f3f3f3; border-top: 6px solid #0073aa; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite;"></div>
				<p style="margin-top: 20px; font-size: 16px; color: #333;">Connecting to Easyship...</p>
				<style>
					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
				</style>
			`;
			doc.body.appendChild(container);
		}

		let data = {
			action: "easyship_connect",
			nonce: easyship_ajax_action_params.nonce,
		};

		jQuery.ajax({
			url: easyship_ajax_action_params.url,
			type: "POST",
			dataType: "json",
			data: data,
			success: function (response) {
				if (response.error) {
					console.error(response);
					if (has_opened_new_tab) {
						const doc = new_tab.document;
						doc.open();
						doc.close();
						doc.title = "Easyship - Connection Error";

						const h2 = doc.createElement("h2");
						h2.textContent = "❌ Could not connect to Easyship";
						doc.body.appendChild(h2);

						const pre = doc.createElement("pre");
						pre.style.textAlign = "left";
						pre.style.margin = "20px auto";
						pre.style.maxWidth = "600px";
						pre.style.whiteSpace = "pre-wrap";
						pre.textContent = JSON.stringify(response, null, 2);
						doc.body.appendChild(pre);
					}
				} else {
					has_opened_new_tab &&
						(new_tab.location.href = response.redirect_url);
				}
			},
			error: function (xhr, status, error) {
				console.error("AJAX error:", status, error);
				if (has_opened_new_tab) {
					const doc = new_tab.document;
					doc.open();
					doc.close();
					doc.title = "Easyship - Connection Error";

					const h2 = doc.createElement("h2");
					h2.textContent = "❌ Easyship connection failed";
					doc.body.appendChild(h2);

					const p = doc.createElement("p");
					p.textContent = "Error: " + (error || status);
					doc.body.appendChild(p);

					if (xhr.responseText) {
						const pre = doc.createElement("pre");
						pre.style.textAlign = "left";
						pre.style.margin = "20px auto";
						pre.style.maxWidth = "600px";
						pre.style.whiteSpace = "pre-wrap";
						pre.textContent = xhr.responseText;
						doc.body.appendChild(pre);
					}
				}
			},
			complete: function () {
				connect_button.prop("disabled", false);
			},
		});
	});
});
