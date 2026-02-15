<?php
/**
 * Load admin view for changing the CSS of pop ups.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

echo '   <div id="popDesignSubTabContainer" class="mo-subpage-container ' . esc_attr( $design_hidden ) . '">
			<form name="f" method="post" action="" id="mo_otp_verification_popup_change">
				<input type="hidden" name="option" value="mo_customer_validation_popup_change" />';
				wp_nonce_field( $template_nonce );
echo '	    	<div class="mo-header">
					<p class="mo-heading flex-1">' . esc_html( __( 'Pop-up Design', 'miniorange-otp-verification' ) ) . '</p>
				</div>';
echo '	        <div class= "border-b flex flex-col gap-mo-6 px-mo-4">    
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html__( 'Popup Field', 'miniorange-otp-verification' ) . '</h5>
							<p class="mo-caption mt-mo-2">' . esc_html__( 'Please define the CSS properties for the OTP field within the popup container.', 'miniorange-otp-verification' ) . '</p>
						</div>
						<div class="flex-1 pr-mo-6 mt-mo-4">
							<div class="flex gap-mo-4">
								<select id="select_popup_option" name="select_popup_option"  style="width:100%; height:42px" class=" active rounded-md"> ';

foreach ( $mo_template_types as $key => $val ) {
	$selected_attr = isset( $val['selected'] ) ? $val['selected'] : '';
	$option_id     = isset( $val['id'] ) ? $val['id'] : '';
	echo '                             <option ' . esc_attr( $selected_attr ) . ' id="' . esc_attr( $option_id ) . '" class="p-mo-5 m-mo-2">' . esc_html( $key ) . ' </option>';
}
echo '     
								</select>';

$popup_template_change_feature = '<input type="button" class="mo-button inverted" disabled value="Save Template" />
							</div>
							<div id="changePopupHide">
								<div class="p-mo-6 flex items-center bg-amber-50 gap-mo-4 border mt-mo-2">
									<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
									<g id="ed4dbae0a5a140e962355cd15d67b61d">
										<path id="2b98dc7ba76d93c3d47096d209bece84" d="M18.5408 3.72267L17.9772 4.21745L17.9772 4.21745L18.5408 3.72267ZM21.4629 7.05149L22.0266 6.55672L22.0266 6.55672L21.4629 7.05149ZM21.559 9.79476L22.1563 10.2484L22.1563 10.2484L21.559 9.79476ZM13.6854 20.1597L13.0882 19.706L13.0882 19.706L13.6854 20.1597ZM10.3146 20.1597L10.9119 19.706L10.9119 19.706L10.3146 20.1597ZM2.44095 9.79476L1.84373 10.2484L1.84373 10.2484L2.44095 9.79476ZM2.53709 7.05149L3.10074 7.54627L3.10074 7.54627L2.53709 7.05149ZM5.45918 3.72267L4.89554 3.2279L4.89554 3.2279L5.45918 3.72267ZM21.5684 9.13285C21.9827 9.13285 22.3184 8.79707 22.3184 8.38285C22.3184 7.96864 21.9827 7.63285 21.5684 7.63285V9.13285ZM12 20.7634L11.2907 21.0071C11.3947 21.31 11.6797 21.5134 12 21.5134C12.3203 21.5134 12.6053 21.31 12.7093 21.0071L12 20.7634ZM2.43156 7.63285C2.01735 7.63285 1.68156 7.96864 1.68156 8.38285C1.68156 8.79707 2.01735 9.13285 2.43156 9.13285V7.63285ZM17.9772 4.21745L20.8993 7.54627L22.0266 6.55672L19.1045 3.2279L17.9772 4.21745ZM20.9618 9.34108L13.0882 19.706L14.2826 20.6133L22.1563 10.2484L20.9618 9.34108ZM10.9119 19.706L3.03818 9.34108L1.84373 10.2484L9.71741 20.6133L10.9119 19.706ZM3.10074 7.54627L6.02283 4.21745L4.89554 3.2279L1.97345 6.55672L3.10074 7.54627ZM14.1263 3.75H16.9516V2.25H14.1263V3.75ZM16.2526 9.13285H21.5684V7.63285H16.2526V9.13285ZM13.4288 3.27554L15.5551 8.6584L16.9502 8.10731L14.8239 2.72446L13.4288 3.27554ZM12.7093 21.0071L16.962 8.6265L15.5433 8.13921L11.2907 20.5198L12.7093 21.0071ZM7.04842 3.75H10.1099V2.25H7.04842V3.75ZM10.1099 3.75H14.1263V2.25H10.1099V3.75ZM2.43156 9.13285H7.74736V7.63285H2.43156V9.13285ZM7.74736 9.13285H16.2526V7.63285H7.74736V9.13285ZM9.42318 2.69857L7.0606 8.08143L8.43412 8.68428L10.7967 3.30143L9.42318 2.69857ZM12.7093 20.5198L8.45668 8.13921L7.03804 8.6265L11.2907 21.0071L12.7093 20.5198ZM3.03818 9.34108C2.63124 8.80539 2.65814 8.05047 3.10074 7.54627L1.97345 6.55672C1.05978 7.59756 1.00597 9.14561 1.84373 10.2484L3.03818 9.34108ZM13.0882 19.706C12.5371 20.4313 11.4629 20.4313 10.9119 19.706L9.71741 20.6133C10.8687 22.1289 13.1313 22.1289 14.2826 20.6133L13.0882 19.706ZM20.8993 7.54627C21.3419 8.05047 21.3688 8.80539 20.9618 9.34108L22.1563 10.2484C22.994 9.14561 22.9402 7.59756 22.0266 6.55672L20.8993 7.54627ZM19.1045 3.2279C18.5597 2.60732 17.7765 2.25 16.9516 2.25V3.75C17.3413 3.75 17.7149 3.91868 17.9772 4.21745L19.1045 3.2279ZM6.02283 4.21745C6.28509 3.91868 6.65866 3.75 7.04842 3.75V2.25C6.22346 2.25 5.44029 2.60732 4.89554 3.2279L6.02283 4.21745Z" fill="rgb(217 119 6)"></path>
									</g>
									</svg>
									<div class="grow">
											<div class="font-bold text-amber-600 m-mo-0">' . esc_html__( 'Premium Feature', 'miniorange-otp-verification' ) . '</div><br>
											<div class="text-amber-600 m-mo-0">' . esc_html__( 'Please Upgrade to Premium plans to use this feature.', 'miniorange-otp-verification' ) . '</div>
									</div>
									<a href="' . esc_url( admin_url( 'admin.php?page=mootppricing' ) ) . '" id="mo_transaction_report_contact" class="mo-button primary inverted cursor-pointer float-right" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Upgrade', 'miniorange-otp-verification' ) . '</a>
								</div>
							</div>';

$popup_template_change_feature = apply_filters( 'mo_popup_template_change', $popup_template_change_feature, $disabled );

echo wp_kses(
	$popup_template_change_feature,
	array(
		'div'    => array( 'class' => array() ),
		'span'   => array( 'style' => array() ),
		'input'  => array(
			'type'     => array(),
			'name'     => array(),
			'class'    => array(),
			'checked'  => array(),
			'value'    => array(),
			'id'       => array(),
			'disabled' => array(),
		),
		'a'      => array(
			'href'   => array(),
			'class'  => array(),
			'target' => array(),
		),
		'svg'    => array(
			'class'   => true,
			'width'   => true,
			'height'  => true,
			'viewbox' => true,
			'fill'    => true,
		),
		'circle' => array(
			'id'           => true,
			'cx'           => true,
			'cy'           => true,
			'cz'           => true,
			'r'            => true,
			'stroke'       => true,
			'stroke-width' => true,
		),
		'g'      => array(
			'fill' => true,
			'id'   => true,
		),
		'path'   => array(
			'd'              => true,
			'fill'           => true,
			'id'             => true,
			'stroke'         => true,
			'stroke-width'   => true,
			'stroke-linecap' => true,
		),
	)
);


echo ' 	
						<div class=" rounded-sm mo_customer_validation-modal-content" style="box-shadow:none;">
							<div class="mo_customer_validation-modal-header mo-new-ui-header">
								<div class="mo-popup-header">' . esc_html__( 'Validate OTP (One Time Passcode)', 'miniorange-otp-verification' ) . '</div>
							</div>
							<div class="mo_customer_validation-modal-body center">
								<div>' . esc_html__( 'PopUp Message shows up here', 'miniorange-otp-verification' ) . '</div>
									<br>
									<div class="mo_customer_validation-login-container">
										<div id="mo_template_show_default" style="' . esc_attr( $mo_template_types['Default']['hidden'] ) . '">
											<input style="height:40px;" class="mo_customer_validation-textbox mo-new-ui-validation-textbox" />
										</div>
										<div id="mo_template_show_streaky" style="' . esc_attr( $mo_template_types['Streaky']['hidden'] ) . '">
											<br>
											<br>
											<div class="otp-input-wrapper">
												<svg viewBox="0 0 240 1">
													<line x1="0" y1="0" x2="240" y2="0" stroke="#3e3e3e" stroke-width="2" stroke-dasharray="44,22" />
												</svg>
											</div>
											<br>
											<style>
												.otp-input-wrapper{margin:auto;width:50%px;text-align:center;display:flex;justify-content:center}.otp-input-wrapper svg{position:relative;display:block;width:240px;height:2px}.otp_demo{display:inline-block;width:40px;height:40px;text-align:center}
											</style>
										</div>
										<div id="mo_template_show_catchy" style="width:100%; margin: 0 auto; ' . esc_attr( $mo_template_types['Catchy']['hidden'] ) . '">
											<div id="input_field_wrapper" style="width:60%; margin: 0 auto;">
												<br>
												<input id="one" class="otp_demo" type="text" maxlength=1>
												<input id="two" class="otp_demo" type="text" maxlength=1>
												<input id="three" class="otp_demo" type="text" maxlength=1>
												<input id="four" class="otp_demo" type="text" maxlength=1>
												<input id="five" class="otp_demo" type="text" maxlength=1>
											</div>
										</div>
										<br>
										<div class="mo-flex-space-between">
											<input type="button" class="miniorange_otp_token_submit mo-close-button-x" value="' . esc_attr__( 'Validate OTP', 'miniorange-otp-verification' ) . '">
											<input type="hidden" name="otp_type" value="phone">
											<a style="float: right; cursor: pointer;">' . esc_html__( 'Resend OTP', 'miniorange-otp-verification' ) . '</a>
										</div>
										<div id="mo_message" hidden="" style="background-color: #f7f6f7; padding: 1em 2em 1em 1.5em; color: #000;">
											<div style="display:table;text-align:center;"></div>
										</div>
									</div>
								</div> <br>
								<div class="mo_customer_validation-login-container"></div>
							</div>
						</div>
					</div>
				</div>
			</form>

			<div class="hidden">
				<div class="mo-header">
					<p class="mo-heading flex-1">' . esc_html( __( 'Advance Settings', 'miniorange-otp-verification' ) ) . '</p>
				</div>
			</div>
			<div class="flex-1 px-mo-8 pt-mo-4 hidden">   
				<div class="design-tab-container">
					<div class="design-tabs-wrapper">
						<div class=" design-tab-item active" target-wrapper="div-wrapper" target-tab="mo_default_popup">
							' . esc_html__( 'DEFAULT POPUP', 'miniorange-otp-verification' ) . '
						</div>
						<div class="design-tab-item" target-wrapper="div-wrapper" target-tab="mo_userchoice_popup">' . esc_html__( 'USER CHOICE POPUP', 'miniorange-otp-verification' ) . '</div>
						<div class="design-tab-item" target-wrapper="div-wrapper" target-tab="mo_external_popup">' . esc_html__( 'EXTERNAL POPUP', 'miniorange-otp-verification' ) . '</div>
						<div class="design-tab-item" target-wrapper="div-wrapper" target-tab="mo_error_popup">' . esc_html__( 'ERROR POPUP', 'miniorange-otp-verification' ) . '</div>
					</div>
				</div>
			</div>
	<div id="advance_box" class="hidden">
		<div class="mo_tab_div">

			<div id="first-dynamic-table">
				<div class="mo-tab-selector active" id="mo_default_popup">
					<div id="default_popup">
						<div class="mo-caption text-center pb-mo-4 pt-mo-6">
							<h3 class="font-bold text-md">' . esc_html__( 'Default Popup template', 'miniorange-otp-verification' ) . '</h3>
							' . esc_html__( 'The pop-up appears when the OTP is sent successfully.', 'miniorange-otp-verification' ) . '
						</div>
			
						<form name="defaultPreview" method="post" action="' . esc_url( admin_post_url() ) . '" target="defaultPreview">
							<div class="flex px-mo-6 py-mo-4 space-x-mo-4">
								<div class="design-template-div"> 
									<div class="design-template-note"><b>' . esc_html__( 'The popup should contain these tags:', 'miniorange-otp-verification' ) . '</b><br> {{JQUERY}}, {{GO_BACK_ACTION_CALL}}, {{FORM_ID}}, {{OTP_FIELD_NAME}}, {{REQUIRED_FIELDS}}, {{REQUIRED_FORMS_SCRIPTS}}, {{BUTTON_NAME}}, {{BUTTON_ID}}, {{BUTTON_TYPE}}, {{OTP_FIELD_CLASS}}, {{OTP_FIELD_HIDDEN}}, {{OTP_FIELD_ID}}</div>  
									<input type="hidden" class="mo-input" id="popactionvalue" name="action" value=""> 
									<input type="hidden" class="mo-input" name="popuptype" value="' . esc_attr( $default_template_type ) . '"> ';
							wp_nonce_field( $nonce, 'popup_display_nonce' );
							wp_editor( $custom_default_popup, $editor_id, $template_settings );
echo '                          </div>
								<div class="design-template-div"> 
									<div class="flex gap-mo-4 my-mo-2 mr-mo-2" style="float:right;">
										<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_popup_reset" data-iframe="defaultPreview" value="' . esc_attr( __( 'Reset', 'miniorange-otp-verification' ) ) . '">                   
										<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_preview_popup" data-iframe="defaultPreview" value="' . esc_attr( __( ' Preview', 'miniorange-otp-verification' ) ) . '"> 
										<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button inverted text-sm" data-popup="mo_popup_save" data-iframe="defaultPreview" value="' . esc_attr( __( ' Save Settings', 'miniorange-otp-verification' ) ) . '">                   
									</div>
									<iframe id="defaultPreview" name="defaultPreview" src="" scrolling="no" style="width:100%;border-radius: 4px;height:467px; background: white; border: 1px solid #dcdcde;"></iframe> 
								</div>
						</form>
					</div>
				</div>
			</div>
			<div class="mo-tab-selector hidden" id="mo_userchoice_popup">
				<div id="userchoice_popup">
					<div class="mo-caption text-center pb-mo-4 pt-mo-6">
						<h3 class="font-bold text-md">' . esc_html__( 'User Choice Popup template', 'miniorange-otp-verification' ) . '</h3>
						' . esc_html__( 'The pop-up appears when user has to select between phone or email verification.', 'miniorange-otp-verification' ) . '
					</div>
					<form name="userchoicePreview" method="post" action="' . esc_url( admin_post_url() ) . '" target="userchoicePreview">
						<div class="flex px-mo-6 py-mo-4 space-x-mo-4">
							<div class="design-template-div">
								<div class="design-template-note"><b>' . esc_html__( 'The popup should contain these tags:', 'miniorange-otp-verification' ) . '</b><br> {{JQUERY}}, {{GO_BACK_ACTION_CALL}}, {{FORM_ID}}, {{MESSAGE}}, {{REQUIRED_FIELDS}}, {{REQUIRED_FORMS_SCRIPTS}}</div>
								<input type="hidden" id="popactionvalue" name="action" value=""> 
								<input type="hidden" name="popuptype" value="' . esc_attr( ( $userchoice_template_type ) ) . '"> ';
							wp_nonce_field( $nonce, 'popup_display_nonce' );
							wp_editor( $custom_userchoice_popup, $editor_id2, $template_settings2 );
echo '                      </div>
							<div class="design-template-div"> 
								<div class="flex gap-mo-4 my-mo-2 mr-mo-2" style="float:right;">
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_popup_reset" data-iframe="userchoicePreview" value="' . esc_attr( __( 'Reset', 'miniorange-otp-verification' ) ) . '">                   
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_preview_popup" data-iframe="userchoicePreview" value="' . esc_attr( __( ' Preview', 'miniorange-otp-verification' ) ) . '"> 
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button inverted text-sm" data-popup="mo_popup_save" data-iframe="userchoicePreview" value="' . esc_attr( __( ' Save Settings', 'miniorange-otp-verification' ) ) . '">                   
								</div>
								<iframe id="userchoicePreview" name="userchoicePreview" src="" scrolling="no" style="width:100%;border-radius: 4px;height:467px; background: white;	border: 1px solid #dcdcde;"></iframe>
							</div>
						</div>
					</form>
				</div>
			</div>
			<div class="mo-tab-selector hidden" id="mo_external_popup">
				<div id="external_popup">
					<div class="mo-caption text-center pb-mo-4 pt-mo-6">
						<h3 class="font-bold text-md">' . esc_html__( 'External Popup template', 'miniorange-otp-verification' ) . '</h3>
						' . esc_html__( 'The pop-up appears when the phone number is not already registered.', 'miniorange-otp-verification' ) . '
					</div>
					<form name="externalPreview" method="post" action="' . esc_url( admin_post_url() ) . '" target="externalPreview">
						<div class="flex px-mo-6 py-mo-4 space-x-mo-4">
							<div class="design-template-div">   
								<div class="design-template-note"><b>' . esc_html__( 'The popup should contain these tags:', 'miniorange-otp-verification' ) . '</b><br> {{JQUERY}}, {{GO_BACK_ACTION_CALL}}, {{FORM_ID}}, {{REQUIRED_FIELDS}}, {{MESSAGE}}, {{PHONE_FIELD_NAME}}, {{OTP_MESSAGE_BOX}}, {{VERIFY_CODE_BOX}}, {{VERIFICATION_FIELD_NAME}}, {{VALIDATE_BTN_ID}}, {{SEND_OTP_BTN_ID}}</div>
								<input type="hidden" id="popactionvalue" name="action" value="">
								<input type="hidden" name="popuptype" value="' . esc_attr( $external_template_type ) . '"> ';
							wp_nonce_field( $nonce, 'popup_display_nonce' );
							wp_editor( $custom_external_popup, $editor_id3, $template_settings3 );
echo '
							</div>
							<div class="design-template-div"> 
								<div class="flex gap-mo-4 my-mo-2 mr-mo-2" style="float:right;">
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_popup_reset" data-iframe="externalPreview" value="' . esc_attr( __( 'Reset', 'miniorange-otp-verification' ) ) . '">                   
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_preview_popup" data-iframe="externalPreview" value="' . esc_attr( __( ' Preview', 'miniorange-otp-verification' ) ) . '"> 
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button inverted text-sm" data-popup="mo_popup_save" data-iframe="externalPreview" value="' . esc_attr( __( ' Save Settings', 'miniorange-otp-verification' ) ) . '">                   
								</div>
								<iframe id="externalPreview" name="externalPreview" src="" scrolling="no" style="width:100%;border-radius: 4px;height:467px; background: white; border: 1px solid #dcdcde;"></iframe> 
							</div>
						</div>
					</form>
				</div>
			</div>

			<div class="mo-tab-selector hidden" id="mo_error_popup">
				<div id="error_popup">
					<div class="mo-caption text-center pb-mo-4 pt-mo-6">
						<h3 class="font-bold text-md">' . esc_html__( 'Error Popup template', 'miniorange-otp-verification' ) . '</h3>
						' . esc_html__( 'The pop-up appears when the OTP is not sent successfully.', 'miniorange-otp-verification' ) . '
					</div>
					<form name="errorPreview" method="post" action="' . esc_url( admin_post_url() ) . '" target="errorPreview">
						<div class="flex px-mo-6 py-mo-4 space-x-mo-4">
							<div class="design-template-div">   
								<div class="design-template-note"><b>' . esc_html__( 'The popup should contain these tags:', 'miniorange-otp-verification' ) . '</b><br> {{JQUERY}}, {{GO_BACK_ACTION_CALL}}, {{FORM_ID}}, {{MESSAGE}}, {{REQUIRED_FIELDS}}, {{REQUIRED_FORMS_SCRIPTS}}</div> 
								<input type="hidden" id="popactionvalue" name="action" value="">
								<input type="hidden" name="popuptype" value="' . esc_attr( $error_template_type ) . '"> ';
							wp_nonce_field( $nonce, 'popup_display_nonce' );
							wp_editor( $error_popup, $editor_id4, $template_settings4 );
echo '
							</div>
							<div class="design-template-div"> 
								<div class="flex gap-mo-4 my-mo-2 mr-mo-2" style="float:right;">
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_popup_reset" data-iframe="errorPreview" value="' . esc_attr( __( 'Reset', 'miniorange-otp-verification' ) ) . '">                   
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button secondary text-sm" data-popup="mo_preview_popup" data-iframe="errorPreview" value="' . esc_attr( __( 'Preview', 'miniorange-otp-verification' ) ) . '"> 
									<input type="button" id="popupbutton" ' . esc_attr( $disabled ) . ' class="mo-button inverted text-sm" data-popup="mo_popup_save" data-iframe="errorPreview" value="' . esc_attr( __( 'Save Settings', 'miniorange-otp-verification' ) ) . '">                   
								</div>
								<iframe id="errorPreview" name="errorPreview" src="" scrolling="no" style="width:100%;border-radius: 4px;height:467px; background: white; border: 1px solid #dcdcde;"></iframe> 
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
	<div class="mo_otp_note font-semibold">
			' . esc_html( __( 'Note: The pop-up is exclusively integrated into the limited forms', 'miniorange-otp-verification' ) ) . '
	</div>
</div>
</div>';

// Register and enqueue the design editor script.
$script_handle = 'mo-design-editor';
if ( ! wp_script_is( $script_handle, 'registered' ) ) {
	wp_register_script(
		$script_handle,
		MOV_URL . 'includes/js/mo-design-editor.js',
		array( 'jquery' ),
		MOV_VERSION,
		true
	);
}

// Prepare data for localization.
$message_html = isset( $message ) ? wp_kses( $message, MoUtility::mo_allow_html_array() ) : '';
$loader_html  = isset( $loaderimgdiv ) ? wp_kses(
	$loaderimgdiv,
	array(
		'img' => array( 'src' => array() ),
		'div' => array( 'style' => array() ),
	)
) : '';

// Enqueue script.
wp_enqueue_script( $script_handle );

// Localize script with necessary data.
wp_localize_script(
	$script_handle,
	'moDesignEditor',
	array(
		'message'          => $message_html,
		'loaderHtml'       => $loader_html,
		'ajaxUrl'          => admin_url( 'admin-post.php' ),
		'resetConfirmText' => esc_js( __( 'Reset the OTP Popup Template back to default? Please note this will delete all custom Popup settings.', 'miniorange-otp-verification' ) ),
	)
);
