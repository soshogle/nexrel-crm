<?php
/**
 * Load admin view for Licensing Tab.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoConstants;
use OTP\Helper\MoAddonListContent;
use OTP\Helper\MoUtility;
use OTP\Helper\TransactionCost;

	$checkmark = '
		<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
		  <g id="1387d83e997b6367c4b5c211e15559b8">
			<path id="fe1f8306c6f43f39ceff3a68bab46acd" d="M7 12.2857L11.4742 15.0677C11.5426 15.1103 11.6323 15.0936 11.6809 15.0293L17 8" stroke="#00D3BA" stroke-width="2" stroke-linecap="round"></path>
		  </g>
		</svg>
	';

	$red_cross = '
		<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
		  <g id="bb49a1baa8f2b053c609302287f4c5cb">
			<g id="2c67efdbf97e2a5d9233fce69c6c90ce">
			  <path id="0a218d13db926129cd6c078df4b7e91c" d="M8 8L16 16" stroke="#FF6060" stroke-width="2" stroke-linecap="round"></path>
			  <path id="659efa9552d3f2b3706cd5cc59cad8c9" d="M16 8L8 16" stroke="#FF6060" stroke-width="2" stroke-linecap="round"></path>
			</g>
		  </g>
		</svg>
	';

	$question_mark_icon = '
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
		  <g id="5d83e4b88b8d72fdf7f1242c6e1a2758">
			<path id="1a33d648b537e4b5428ead7c276e4e43" fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM13 7C13 7.55228 12.5523 8 12 8C11.4477 8 11 7.55228 11 7C11 6.44772 11.4477 6 12 6C12.5523 6 13 6.44772 13 7ZM11 9.25C10.5858 9.25 10.25 9.58579 10.25 10C10.25 10.4142 10.5858 10.75 11 10.75H11.25V17C11.25 17.4142 11.5858 17.75 12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V10C12.75 9.58579 12.4142 9.25 12 9.25H11Z" fill="#28303F"></path>
		  </g>
		</svg>
	';

	$circle_icon = '
		<svg class="min-w-[8px] min-h-[8px]" width="8" height="8" viewBox="0 0 18 18" fill="none">
			<circle id="a89fc99c6ce659f06983e2283c1865f1" cx="9" cy="9" r="7" stroke="rgb(99 102 241)" stroke-width="4"></circle>
		</svg>
	';

	$addon_card      = 'p-5 rounded-md bg-white relative flex flex-col shadow-md';
	$addon_price_tag = 'rounded-md';
	$country_list    = MO_SMS_PRICING;

echo '
<div>
<!--  TABS CONTENT  -->
<div>
	<div class="mo-header">
		<h6 id="mo-section-heading" class="mo-heading">' . esc_html__( 'Licensing Page', 'miniorange-otp-verification' ) . '</h6>
		<a class="mo-button primary medium flex" href="' . esc_url( 'https://plugins.miniorange.com/otp-verification-pricing' ) . '" target="_blank" rel="noopener noreferrer">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0" >
				<path d="M9 11H15M9 15H15M17 21L12 16L7 21V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<span>' . esc_html( __( 'Help Me Choose My Plan', 'miniorange-otp-verification' ) ) . '</span>
		</a>
		<a class="mo-button secondary medium flex" href="#mo_whatsapp_otp_notif_marketing" style="padding-left: 2rem;">
			<svg viewBox="0 0 58 27" id="whatsapp" height="50px" width="40px" class="flex-2" style="position: absolute; margin-right: 4rem;">
				<path fill="#25D366" d="M12 3a9 9 0 00-9 9c0 1.75.51 3.37 1.37 4.75l-1.08 3.53c-.08.27 0 .55.19.75.19.2.49.27.75.19l3.78-1.16.006-.002A8.962 8.962 0 0012 21a9 9 0 000-18zM6.01 16.5c-.41-.55-.76-1.15-1.01-1.81v-.02c-.33-.83-.5-1.74-.5-2.68C4.5 7.86 7.86 4.5 12 4.5c4.14 0 7.5 3.36 7.5 7.5 0 4.14-3.36 7.5-7.5 7.5a7.6 7.6 0 01-1.59-.19l-.015.005a7.375 7.375 0 01-2.215-.875v-.01l-1.84.56-1.21.37.36-1.16.52-1.7zm2.14-8.54a.89.89 0 01.63-.27l.01-.02c.083 0 .163.003.24.005.072.003.142.005.21.005.17.01.35.02.52.4.11.241.289.688.438 1.06.123.305.225.56.252.61.05.11.09.24.01.39l-.028.054c-.063.12-.107.202-.212.316-.04.043-.081.09-.122.137a3.417 3.417 0 01-.247.262c-.108.107-.228.227-.101.451.13.22.59.96 1.27 1.57a6.162 6.162 0 001.692 1.072c.07.032.127.057.168.078.23.12.37.1.51-.05.13-.14.59-.64.75-.86.16-.22.32-.18.53-.1.21.08 1.35.64 1.58.76l.133.068c.155.078.26.13.307.202.05.09.04.54-.16 1.06-.21.52-1.17 1.01-1.6 1.04a5.012 5.012 0 00-.124.01c-.397.038-.893.085-2.666-.62-2.2-.876-3.617-2.986-3.889-3.39a2.432 2.432 0 00-.051-.074c-.144-.195-.92-1.246-.9-2.316.019-1.035.56-1.565.807-1.808l.043-.042z"></path>
		   </svg>
			<span>' . esc_html( __( 'WhatsApp', 'miniorange-otp-verification' ) ) . '</span>
		</a>
		<a class="mo-button secondary medium" href="#otp_pay_method">' . esc_html( __( 'Payments Methods', 'miniorange-otp-verification' ) ) . '</a>
	</div>
	<div class="text-center pt-mo-3 pl-mo-6" >
		<p>' . esc_html__( 'The plans depend on your chosen SMS Gateway. Discover more about', 'miniorange-otp-verification' ) . ' <a href="' . esc_url( 'https://faq.miniorange.com/knowledgebase/use-own-gateway-plugin/' ) . '" target="_blank" rel="noopener noreferrer"><b><u>' . esc_html__( 'SMS Gateway', 'miniorange-otp-verification' ) . '</u></b></a></p>
	</div>
	<div class="bg-slate-50">
		<!--  TABS  -->
		<div id="mo_select_gateway_type_div" class="mo-tab-container">
			<div class="mo-tabs-wrapper">
				<a id="pricingtabitem" class="mo-tab-item active">' . esc_html__( 'Use your own Gateway', 'miniorange-otp-verification' ) . '</a>
				<a id="mogatewaytabitem"  class="mo-tab-item">' . esc_html__( 'Use miniOrange Gateway', 'miniorange-otp-verification' ) . '</a>
			</div>           
		</div>
	</div>
	<div id="mo-new-pricing-page" class="mo-new-pricing-page bg-white rounded-md">
				<!--  PRICING SECTION  -->
				<section id="mo_otp_plans_pricing_table">
					<div id="pricing_plans_div" class="mo-pricing-snippet-grid">

						<div class="mo-pricing-card" >
							<div>
								<h5>' . esc_html__( 'Custom Gateway', 'miniorange-otp-verification' ) . '<br>' . esc_html__( 'Plan', 'miniorange-otp-verification' ) . '</h5>
								<div class="my-mo-4 flex gap-mo-4">
									<div class="flex">
										<h1 class="m-mo-0">$29</h1><span style="font-size:1rem; margin-top:5%"><i>/' . esc_html__( 'Year', 'miniorange-otp-verification' ) . '</i></span>
									</div>
								</div>
							</div> 

							<ul class="mt-mo-4 grow" >';
foreach ( $custom_gateway_plan_features as $features ) {
	echo '   <li class="feature-snippet">
								<span class="mt-mo-2.5">' . wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() ) . '</span>
								<p class="m-mo-0">' . wp_kses( $features, MoUtility::mo_allow_html_array() ) . '</p>
							</li>';
}
echo '                           </ul>

							<button class="w-full mo-button primary" onclick="mo_otp_upgradeform_submit(\'wp_email_verification_intranet_basic_plan\')">' . esc_html__( 'Upgrade Now', 'miniorange-otp-verification' ) . '</button>
						</div>

						<div class="mo-pricing-card">
							<div>
								<h5>' . esc_html__( 'WhatsApp + Twilio', 'miniorange-otp-verification' ) . ' <br>' . esc_html__( 'Gateway Plan', 'miniorange-otp-verification' ) . '</h5>
								<div class="my-mo-4 flex gap-mo-4">
									<div class="flex">
										<h1 class="m-mo-0">$49</h1><span style="font-size:1rem; margin-top:5%"><i>/' . esc_html__( 'Year', 'miniorange-otp-verification' ) . '</i></span>
									</div>
								</div>
							</div>    
							
							<ul class="mt-mo-4 grow" >';
foreach ( $twilio_gateway_plan_features as $features ) {
	if ( 'OTP & Notifications Via WhatsApp' === $features ) {
		echo '  <li class="feature-snippet">
									<span class="mt-mo-2.5" style="margin-left:-6px;margin-top:-10px;margin-right:8px;margin-bottom:5px;">
										<svg viewBox="0 0 58 27" id="whatsapp" height="50px" width="50px" class="flex-2" style="position: absolute; margin-right: 4rem;">
												<path fill="#25D366" d="M12 3a9 9 0 00-9 9c0 1.75.51 3.37 1.37 4.75l-1.08 3.53c-.08.27 0 .55.19.75.19.2.49.27.75.19l3.78-1.16.006-.002A8.962 8.962 0 0012 21a9 9 0 000-18zM6.01 16.5c-.41-.55-.76-1.15-1.01-1.81v-.02c-.33-.83-.5-1.74-.5-2.68C4.5 7.86 7.86 4.5 12 4.5c4.14 0 7.5 3.36 7.5 7.5 0 4.14-3.36 7.5-7.5 7.5a7.6 7.6 0 01-1.59-.19l-.015.005a7.375 7.375 0 01-2.215-.875v-.01l-1.84.56-1.21.37.36-1.16.52-1.7zm2.14-8.54a.89.89 0 01.63-.27l.01-.02c.083 0 .163.003.24.005.072.003.142.005.21.005.17.01.35.02.52.4.11.241.289.688.438 1.06.123.305.225.56.252.61.05.11.09.24.01.39l-.028.054c-.063.12-.107.202-.212.316-.04.043-.081.09-.122.137a3.417 3.417 0 01-.247.262c-.108.107-.228.227-.101.451.13.22.59.96 1.27 1.57a6.162 6.162 0 001.692 1.072c.07.032.127.057.168.078.23.12.37.1.51-.05.13-.14.59-.64.75-.86.16-.22.32-.18.53-.1.21.08 1.35.64 1.58.76l.133.068c.155.078.26.13.307.202.05.09.04.54-.16 1.06-.21.52-1.17 1.01-1.6 1.04a5.012 5.012 0 00-.124.01c-.397.038-.893.085-2.666-.62-2.2-.876-3.617-2.986-3.889-3.39a2.432 2.432 0 00-.051-.074c-.144-.195-.92-1.246-.9-2.316.019-1.035.56-1.565.807-1.808l.043-.042z"></path>
										</svg>
									</span>    
									<p class="m-mo-0 font-bold">' . esc_html( __( 'OTP & Notifications Via WhatsApp.', 'miniorange-otp-verification' ) ) . '</p>
								</li>';

	} else {
		echo '   <li class="feature-snippet">
									<span class="mt-mo-2.5">' . wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() ) . '</span>
									<p class="m-mo-0">' . wp_kses( $features, MoUtility::mo_allow_html_array() ) . '</p>
								</li>';
	}
}
echo '                                  
							</ul>

							<button class="w-full mo-button primary" onclick="mo_otp_upgradeform_submit(\'wp_email_verification_intranet_twilio_basic_plan\')">' . esc_html__( 'Upgrade Now', 'miniorange-otp-verification' ) . '</button>

						</div>

						<div class="mo-pricing-card premium">
							<div>
								<h5>' . esc_html__( 'Enterprise All Inclusive', 'miniorange-otp-verification' ) . '<br>& ' . esc_html__( 'AWS SNS', 'miniorange-otp-verification' ) . '</h5>
								<div class="my-mo-4 flex gap-mo-4">
									<div class="flex">
										<h1 class="m-mo-0 text-white">$99</h1><span style="font-size:1rem; margin-top:5%"><i>/' . esc_html__( 'Year', 'miniorange-otp-verification' ) . '</i></span>
									</div>
								</div>
							</div>    
							
							<ul class="mt-mo-4 grow" >';
foreach ( $enterprise_plan_features as $features ) {
	echo '   <li class="feature-snippet">
								<span class="mt-mo-2.5">' . wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() ) . '</span>
								<p class="m-mo-0">' . wp_kses( $features, MoUtility::mo_allow_html_array() ) . '</p>
							</li>';
}
echo '                          
							</ul>
							<button class="w-full mo-button primary" onclick="mo_otp_upgradeform_submit(\'wp_email_verification_intranet_enterprise_plan\')">' . esc_html__( 'Upgrade Now', 'miniorange-otp-verification' ) . '</button>
						</div>


						<div class="mo-pricing-card" style="border:none;">
							<div>
								<h5>' . esc_html__( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) . '</h5>
								<div class="my-mo-4 flex gap-mo-4">
									<div class="flex">
										<h1 class="m-mo-0">$149</h1><span style="font-size:1rem; margin-top:5%"><i>/' . esc_html__( 'Year', 'miniorange-otp-verification' ) . '</i></span>
									</div>
								</div>
							</div>    
							
							<ul class="mt-mo-4 grow">';
foreach ( $woocommerce_plan_features as $features ) {
		echo '   <li class="feature-snippet">
		<span class="mt-mo-2.5">' . wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() ) . '</span>
		<p class="m-mo-0">' . wp_kses( $features, MoUtility::mo_allow_html_array() ) . '</p>
	</li>';
}

echo '                           
							</ul>
							<a class="w-full mo-button primary" href="https://wordpress.org/plugins/miniorange-sms-order-notification-otp-verification/" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Try The Free Plan Now!', 'miniorange-otp-verification' ) . '</a><br>
							<button class="w-full mo-button primary" onclick="mo_otp_upgradeform_submit(\'wp_email_verification_intranet_woocommerce_plan\')">' . esc_html__( 'Upgrade Now', 'miniorange-otp-verification' ) . '</button>
						</div>

					</div>

				<!--  DETAILED PLAN  -->

				<div class="overflow-x-auto relative rounded-b-lg">
					<table id="pricing-table" class="mo-table mt-mo-4">
						<tbody>';

							echo '<tr>';
echo '<th scope="row" class="py-mo-4 pr-mo-6 text-md mo_feature_pricing_row">
		' . esc_html( __( 'Forms Supported', 'miniorange-otp-verification' ) ) . '<br>
		<i><a class="mo_links mo_pricing_links" href="' . esc_url( 'https://plugins.miniorange.com/otp-verification-forms' ) . '" target="_blank">' . esc_html( __( 'Click here to check all supported forms', 'miniorange-otp-verification' ) ) . '</a></i>
	  </th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Custom Gateway with Addons', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'WhatsApp + Twilio Gateway Plan', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Enterprise All Inclusive + AWS SNS', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) ) . '
								</th>';
echo '</tr>';

foreach ( $premium_forms_custom_gateway as $form => $data ) {
	echo '<tr class="bg-white border-b">';
	echo '<th scope="row" class="mo-caption-pricing py-mo-2 px-mo-6">' . esc_html( $form ) . '</th>';

	foreach ( $data['feature'] as $feature ) {
		echo '<td class="py-mo-2 pl-mo-24">';
		echo wp_kses( 'checkmark' === $feature ? $checkmark : $red_cross, MoUtility::mo_allow_svg_array() );
		echo '</td>';
	}
	echo '</tr>';
}

echo '<tr>';
echo '<th scope="row" class="py-mo-4 pr-mo-6 text-md mo_feature_pricing_row">
		' . esc_html__( 'Gateways Supported', 'miniorange-otp-verification' ) . '<br>
		<i><a class="mo_links mo_pricing_links" href="' . esc_url( MoConstants::MO_SUPPORTED_GATEWAYS_URL ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( __( 'Click here to check all supported gateways', 'miniorange-otp-verification' ) ) . '</a></i>
	  </th>
		<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Custom Gateway with Addons', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
								   ' . esc_html( __( 'WhatsApp + Twilio Gateway Plan', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Enterprise All Inclusive + AWS SNS', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
								   ' . esc_html( __( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) ) . '
								</th>';
echo '</tr>';

foreach ( $gateways_supported as $gateway => $data ) {
	echo '<tr class="bg-white border-b">';
	echo '<th scope="row" class="mo-caption-pricing py-mo-2 px-mo-6">' . esc_html( $gateway ) . '</th>';

	foreach ( $data['feature'] as $feature ) {
		echo '<td class="py-mo-2 pl-mo-24">';
		echo wp_kses( 'checkmark' === $feature ? $checkmark : $red_cross, MoUtility::mo_allow_svg_array() );
		echo '</td>';
	}
	echo '</tr>';
}

echo '<tr>';
echo '<th scope="row" class="py-mo-4 px-mo-6 text-md mo_feature_pricing_row">Features</th>
  <th scope="col" class="mo-table-block">
									' . esc_html( __( 'Custom Gateway with Addons', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'WhatsApp + Twilio Gateway Plan', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Enterprise All Inclusive + AWS SNS', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) ) . '
								</th>';

echo '</tr>';

foreach ( $premium_features as $feature => $data ) {
	echo '<tr class="bg-white border-b">';
	echo '<th scope="row" class="mo-caption-pricing py-mo-2 px-mo-6">' . esc_html( $feature ) . '</th>';

	foreach ( $data['feature'] as $feature ) {
		echo '<td class="py-mo-2 pl-mo-24">';
		echo wp_kses( 'checkmark' === $feature ? $checkmark : $red_cross, MoUtility::mo_allow_svg_array() );
		echo '</td>';
	}
	echo '</tr>';
}

echo '

						</tbody>
					</table>
				</div>        
			</section>
			
			<section id="mo_otp_miniorange_gateway_pricing" style="display: none;">
				<div class="bg-slate-50">

					<div class="mo-pricing-snippet-grid">

						<div class="mo-miniorange-pricing-card" >
							<div>
								<h5>' . esc_html__( 'MiniOrange Gateway Plan', 'miniorange-otp-verification' ) . '</h5>
								<div class="my-mo-4 flex gap-mo-4">
									<h6 class="m-mo-0 font-medium">(' . esc_html__( 'Transaction-Based Pricing', 'miniorange-otp-verification' ) . ')</h6>
								</div>
							</div> 

							<ul class="mt-mo-4 grow" >';

foreach ( $miniorange_gateway_plan_features as $features ) {
					echo '   <li class="feature-snippet">
						  <span class="mt-mo-2.5">' . wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() ) . '</span>
								<p class="m-mo-0">' . wp_kses( $features, MoUtility::mo_allow_html_array() ) . '</p>
							</li>';
}
echo '  
								
							   <li class="feature-snippet" style="display: table;margin: 0 auto;width: 100%;">
									<br>
									<br>
									<form action="" method="post" id="mo_sms_pricing" >';
									wp_nonce_field( 'mosmsnonce', 'mo_sms_pricing_nonce' );
echo '									<select name="languages" style="margin-bottom:0.5rem;width:100%;" id="mochoosecountry">
											<option>' . esc_html__( 'Select your target country', 'miniorange-otp-verification' ) . '</option>';
foreach ( $country_list  as $key => $value ) {
	echo '									<option value="' . esc_attr( $key ) . '">' . esc_attr( $key ) . '</option>';
}
echo '									</select>
										<select name="transactions" id="mosmspricing" style="width:100%;">
											<option id="moloading">' . esc_html( __( 'Check SMS Transaction Pricing*', 'miniorange-otp-verification' ) ) . '</option>
											<option id="moloading">' . esc_html( __( 'Select the target country to check pricing', 'miniorange-otp-verification' ) ) . '</option>
										</select>
										<select class="mt-mo-2 w-full" name="email_transactions" id="moemailpricing" >
											<option >' . esc_html( __( 'Check Email Transaction Pricing', 'miniorange-otp-verification' ) ) . '</option>
											<option >100 transactions- $2</option>
											<option >500 transactions- $5</option>
											<option >1000 transactions- $7</option>
											<option >5000 transactions- $20</option>
											<option >10000 transactions- $30</option>
											<option >50000 transactions- $45</option>
										</select>
									</form>
								</li>
							</ul>

							<button class="w-full mo-button primary" onclick="mo_otp_upgradeform_submit(\'wp_otp_verification_basic_plan\')">' . esc_html__( 'Upgrade Now', 'miniorange-otp-verification' ) . '</button>
						</div>

						<div class="mo-miniorange-pricing-card premium">
							<div>
								<h5>' . esc_html__( 'Enterprise All Inclusive', 'miniorange-otp-verification' ) . '<br>& ' . esc_html__( 'AWS SNS', 'miniorange-otp-verification' ) . '</h5>
								<div class="my-mo-4 flex gap-mo-4">
									<div class="flex">
										<h1 class="m-mo-0 text-white">$99</h1><span style="font-size:1rem; margin-top:5%"><i>/' . esc_html__( 'Year', 'miniorange-otp-verification' ) . '</i></span>
									</div>
								</div>
							</div>    
							
							<ul class="mt-mo-4 grow" >
								<li class="feature-snippet">
									<span class="mt-mo-2.5" style="margin-left:-6px;margin-top:-10px;margin-right:8px;margin-bottom:5px;">
										<svg viewBox="0 0 58 27" id="whatsapp" height="50px" width="50px" class="flex-2" style="position: absolute; margin-right: 4rem;">
												<path fill="#25D366" d="M12 3a9 9 0 00-9 9c0 1.75.51 3.37 1.37 4.75l-1.08 3.53c-.08.27 0 .55.19.75.19.2.49.27.75.19l3.78-1.16.006-.002A8.962 8.962 0 0012 21a9 9 0 000-18zM6.01 16.5c-.41-.55-.76-1.15-1.01-1.81v-.02c-.33-.83-.5-1.74-.5-2.68C4.5 7.86 7.86 4.5 12 4.5c4.14 0 7.5 3.36 7.5 7.5 0 4.14-3.36 7.5-7.5 7.5a7.6 7.6 0 01-1.59-.19l-.015.005a7.375 7.375 0 01-2.215-.875v-.01l-1.84.56-1.21.37.36-1.16.52-1.7zm2.14-8.54a.89.89 0 01.63-.27l.01-.02c.083 0 .163.003.24.005.072.003.142.005.21.005.17.01.35.02.52.4.11.241.289.688.438 1.06.123.305.225.56.252.61.05.11.09.24.01.39l-.028.054c-.063.12-.107.202-.212.316-.04.043-.081.09-.122.137a3.417 3.417 0 01-.247.262c-.108.107-.228.227-.101.451.13.22.59.96 1.27 1.57a6.162 6.162 0 001.692 1.072c.07.032.127.057.168.078.23.12.37.1.51-.05.13-.14.59-.64.75-.86.16-.22.32-.18.53-.1.21.08 1.35.64 1.58.76l.133.068c.155.078.26.13.307.202.05.09.04.54-.16 1.06-.21.52-1.17 1.01-1.6 1.04a5.012 5.012 0 00-.124.01c-.397.038-.893.085-2.666-.62-2.2-.876-3.617-2.986-3.889-3.39a2.432 2.432 0 00-.051-.074c-.144-.195-.92-1.246-.9-2.316.019-1.035.56-1.565.807-1.808l.043-.042z"></path>
										</svg>
									</span>    
									<p class="m-mo-0 font-bold">' . esc_html( __( 'OTP & Notifications Via WhatsApp.', 'miniorange-otp-verification' ) ) . '</p>
								</li>';
foreach ( $enterprise_plan_features as $features ) {
	echo '                          
								<li class="feature-snippet">
									<span class="mt-mo-2.5">' . wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() ) . '</span>
									<p class="m-mo-0">' . wp_kses( $features, MoUtility::mo_allow_html_array() ) . '</p>
								</li>';
}
echo '      
							</ul>
							<button class="w-full mo-button primary" onclick="mo_otp_upgradeform_submit(\'wp_email_verification_intranet_enterprise_plan\')">' . esc_html__( 'Upgrade Now', 'miniorange-otp-verification' ) . '</button>
						</div>


						<div class="mo-miniorange-pricing-card" style="border:none;">
							<div>
								<h5>' . esc_html__( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) . '</h5>
								<div class="my-mo-4 flex gap-mo-4">
									<div class="flex">
										<h1 class="m-mo-0">$149</h1><span style="font-size:1rem; margin-top:5%"><i>/' . esc_html__( 'Year', 'miniorange-otp-verification' ) . '</i></span>
									</div>
								</div>
							</div>    
							
							 <ul class="mt-mo-4 grow">';
foreach ( $woocommerce_plan_features as $features ) {
	if ( 'OTP & Notifications Via WhatsApp' === $features ) {
		echo ' <li class="feature-snippet">
									 <span class="mt-mo-2.5" style="margin-left:-6px;margin-top:-10px;margin-right:8px;margin-bottom:5px;">
										 <svg viewBox="0 0 58 27" id="whatsapp" height="50px" width="50px" class="flex-2" style="position: absolute; margin-right: 4rem;">
												 <path fill="#25D366" d="M12 3a9 9 0 00-9 9c0 1.75.51 3.37 1.37 4.75l-1.08 3.53c-.08.27 0 .55.19.75.19.2.49.27.75.19l3.78-1.16.006-.002A8.962 8.962 0 0012 21a9 9 0 000-18zM6.01 16.5c-.41-.55-.76-1.15-1.01-1.81v-.02c-.33-.83-.5-1.74-.5-2.68C4.5 7.86 7.86 4.5 12 4.5c4.14 0 7.5 3.36 7.5 7.5 0 4.14-3.36 7.5-7.5 7.5a7.6 7.6 0 01-1.59-.19l-.015.005a7.375 7.375 0 01-2.215-.875v-.01l-1.84.56-1.21.37.36-1.16.52-1.7zm2.14-8.54a.89.89 0 01.63-.27l.01-.02c.083 0 .163.003.24.005.072.003.142.005.21.005.17.01.35.02.52.4.11.241.289.688.438 1.06.123.305.225.56.252.61.05.11.09.24.01.39l-.028.054c-.063.12-.107.202-.212.316-.04.043-.081.09-.122.137a3.417 3.417 0 01-.247.262c-.108.107-.228.227-.101.451.13.22.59.96 1.27 1.57a6.162 6.162 0 001.692 1.072c.07.032.127.057.168.078.23.12.37.1.51-.05.13-.14.59-.64.75-.86.16-.22.32-.18.53-.1.21.08 1.35.64 1.58.76l.133.068c.155.078.26.13.307.202.05.09.04.54-.16 1.06-.21.52-1.17 1.01-1.6 1.04a5.012 5.012 0 00-.124.01c-.397.038-.893.085-2.666-.62-2.2-.876-3.617-2.986-3.889-3.39a2.432 2.432 0 00-.051-.074c-.144-.195-.92-1.246-.9-2.316.019-1.035.56-1.565.807-1.808l.043-.042z"></path>
										 </svg>
									 </span>    
									 <p class="m-mo-0">' . esc_html( __( 'OTP & Notifications Via WhatsApp.', 'miniorange-otp-verification' ) ) . '</p>
								 </li>';

	} else {
		echo '   <li class="feature-snippet">
		 <span class="mt-mo-2.5">' . wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() ) . '</span>
		 <p class="m-mo-0">' . wp_kses( $features, MoUtility::mo_allow_html_array() ) . '</p>
	 </li>';
	}
}
echo '     </ul>
							<a class="w-full mo-button primary" href="https://wordpress.org/plugins/miniorange-sms-order-notification-otp-verification/" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Try The Free Plan Now!', 'miniorange-otp-verification' ) . '</a><br>
							<button class="w-full mo-button primary" onclick="mo_otp_upgradeform_submit(\'wp_email_verification_intranet_woocommerce_plan\')">' . esc_html__( 'Upgrade Now', 'miniorange-otp-verification' ) . '</button>
						</div>

					</div>
				</div>

				<!--  DETAILED PLAN  -->

				<div class="overflow-x-auto relative rounded-b-lg">
					<table id="pricing-table" class="mo-table mt-mo-4" >
						<tbody>';

										echo '<tr>';
echo '<th scope="row" class="py-mo-4 pr-mo-6 text-md mo_feature_pricing_row">
		   ' . esc_html( __( 'Forms Supported', 'miniorange-otp-verification' ) ) . '<br>
			<i><a class="mo_links mo_pricing_links" href="' . esc_url( 'https://plugins.miniorange.com/otp-verification-forms' ) . '" target="_blank">' . esc_html( __( 'Click here to check all supported forms', 'miniorange-otp-verification' ) ) . '</a></i>
		</th>
		<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Miniorange Gateway Plan', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Enterprise All Inclusive + AWS SNS', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) ) . '
								</th>';
echo '</tr>';

foreach ( $premium_forms_mo_gateway as $form => $data ) {
	echo '<tr class="bg-white border-b">';
	echo '<th scope="row" class="mo-caption-pricing py-mo-2 px-mo-6">' . esc_html( $form ) . '</th>';

	foreach ( $data['feature'] as $feature ) {
		echo '<td class="py-mo-2 pl-mo-24">';
		echo wp_kses( 'checkmark' === $feature ? $checkmark : $red_cross, MoUtility::mo_allow_svg_array() );
		echo '</td>';
	}
	echo '</tr>';
}echo '<tr>';
echo '<th scope="row" class="py-mo-4 pr-mo-6 text-md mo_feature_pricing_row">
		' . esc_html__( 'Gateways Supported', 'miniorange-otp-verification' ) . '<br>
		<i><a class="mo_links mo_pricing_links" href="' . esc_url( MoConstants::MO_SUPPORTED_GATEWAYS_URL ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( __( 'Click here to check all supported gateways', 'miniorange-otp-verification' ) ) . '</a></i>
		</th>
	  <th scope="col" class="mo-table-block">
									' . esc_html( __( 'Miniorange Gateway Plan', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Enterprise All Inclusive + AWS SNS', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) ) . '
								</th>';
echo '</tr>';

foreach ( $gateways_supported_mo as $gateway => $data ) {
	echo '<tr class="bg-white border-b">';
	echo '<th scope="row" class="mo-caption-pricing py-mo-2 px-mo-6">' . esc_html( $gateway ) . '</th>';

	foreach ( $data['feature'] as $feature ) {
		echo '<td class="py-mo-2 pl-mo-24">';
		echo wp_kses( 'checkmark' === $feature ? $checkmark : $red_cross, MoUtility::mo_allow_svg_array() );
		echo '</td>';
	}
	echo '</tr>';
}
echo '<tr>';
echo '<th scope="row" class="py-mo-4 px-mo-6 text-md mo_feature_pricing_row">' . esc_html__( 'Features', 'miniorange-otp-verification' ) . '</th>
  <th scope="col" class="mo-table-block">
									' . esc_html( __( 'Miniorange Gateway Plan', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Enterprise All Inclusive + AWS SNS', 'miniorange-otp-verification' ) ) . '
								</th>
								<th scope="col" class="mo-table-block">
									' . esc_html( __( 'Woocommerce OTP & Notification Plan', 'miniorange-otp-verification' ) ) . '
								</th>';

echo '</tr>';
foreach ( $premium_features_mo as $feature => $data ) {
	echo '<tr class="bg-white border-b">';
	echo '<th scope="row" class="mo-caption-pricing py-mo-2 px-mo-6">' . esc_html( $feature ) . '</th>';

	foreach ( $data['feature'] as $feature ) {
		echo '<td class="py-mo-2 pl-mo-24">';
		echo wp_kses( 'checkmark' === $feature ? $checkmark : $red_cross, MoUtility::mo_allow_svg_array() );
		echo '</td>';
	}
	echo '</tr>';
}
echo '
						</tbody>
					</table>
					<div class="mo_otp_note px-mo-8 pb-mo-4">              
						<p class="m-mo-0" style="font-size:12px;">*' . esc_html__( 'The pricing for SMS transactions is subject to change in accordance with updates from network providers.', 'miniorange-otp-verification' ) . '</p>
					</div>
				</div>
			</section>
		</div>
	</div>
';

echo '<div class="m-mo-4 border dark:border-gray-700" id="mo_whatsapp_otp_notif_marketing" >
				<div class="mo-header">
					<div class="flex flex-1 gap-mo-4">
						<img src="' . esc_url( MOV_WHATSAPP ) . '" style="height:40px;width:40px;" >
						<p class="mo-heading flex-1 mt-mo-2">' . esc_html( __( 'OTP & Notifications Via WhatsApp', 'miniorange-otp-verification' ) ) . '</p>
					</div>
					<a class="mo-button inverted flex-2 mo-support-link" target="_blank" href="https://plugins.miniorange.com/login-with-whatsapp-as-a-two-factor-method-for-wordpress" data-message="' . esc_attr( 'Hi! I am interested in using WhatsApp for my website, can you please schedule a demo?' ) . '">' . esc_html__( 'Get Demo', 'miniorange-otp-verification' ) . '</a><br>
				</div>
				<div class="pt-mo-8">
					<div class="px-mo-8 py-mo-3">' . esc_html( __( 'We provide OTP & Notifications via WhatsApp in our plugin. Use your own business account or miniOrange business account for sending the WhatsApp OTPs & Notifications.', 'miniorange-otp-verification' ) ) . '
					</div>
					<div class="flex ml" style="margin-left:3%;">
							<div class="flex-1 p-mo-8">';
foreach ( $whatsapp_plugin_features1 as $feature ) {
	echo '  <li class="feature-snippet">
										<span class="mt-mo-1.5">';
	echo wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() );
	echo '  </span><p class="m-mo-0">';
	echo wp_kses( $feature, MoUtility::mo_allow_html_array() );
	echo '  </p>
									</li>';
}
															echo '
														</div>
														<div class="flex-1 p-mo-8">';
foreach ( $whatsapp_plugin_features2 as $feature ) {
	echo '  <li class="feature-snippet">
										<span class="mt-mo-1.5">';
	echo wp_kses( $circle_icon, MoUtility::mo_allow_svg_array() );
	echo '  </span><p class="m-mo-0">';
	echo esc_html( $feature );
	echo '  </p>
									</li>';
}
							echo '
							</div>
					</div>
				</div>
			</div>';


echo '
	 <div class="m-mo-4 border dark:border-gray-700" id="otp_payment">
		<div id="otp_pay_method">
			<div class="mo-header">
				<p class="mo-heading flex-1 mt-mo-2">' . esc_html( __( 'Supported Payment Methods', 'miniorange-otp-verification' ) ) . '</p>              
			</div>
			<div class="mo-pricing-container">
				<div class="mo-card-pricing-deck">
					<div class="mo-card-pricing mo-animation">
						<div class="mo-card-pricing-header">
							<img  src="' . esc_url( MOV_CARD ) . '"  style="size: landscape;width: 100px; height: 27px; margin-bottom: 4px;margin-top: 4px;opacity: 1;padding-left: 8px;">
						</div>
						<hr style="border-top: 4px solid #fff;">
						<div class="mo-card-pricing-body">
							<p>' . esc_html__( 'If payment is made through Intenational Credit Card/Debit card, the license will be created automatically once payment is completed.', 'miniorange-otp-verification' ) . '</p>
							<p style="margin-top: 20%;"><i><b>' . wp_kses(
								sprintf(
									/* translators: %s: Link text "Click Here" */
									__( '%s to know more.', 'miniorange-otp-verification' ),
									'<a class="mo_links" href="' . esc_url( MoConstants::FAQ_PAY_URL ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a>'
								),
								array(
									'a' => array(
										'href'   => array(),
										'target' => array(),
										'rel'    => array(),
										'class'  => array(),
									),
									'b' => array(),
									'i' => array(),
								)
							) . '</b></i></p>
						</div>
					</div>
					<div class="mo-card-pricing mo-animation">
						<div class="mo-card-pricing-header">
							<img  src="' . esc_url( MOV_NETBANK ) . '"  style="size: landscape;width: 100px; height: 27px; margin-bottom: 4px;margin-top: 4px;opacity: 1;padding-left: 8px;">
						</div>
						<hr style="border-top: 4px solid #fff;">
						<div class="mo-card-pricing-body">
							<p>' . wp_kses(
								sprintf(
									/* translators: %s: Support email address */
									__( 'If you want to use net banking for payment then contact us at %s so that we can provide you bank details.', 'miniorange-otp-verification' ),
									'<i><b style="color:#1261d8">' . esc_html( MoConstants::SUPPORT_EMAIL ) . '</b></i>'
								),
								array(
									'i' => array(),
									'b' => array( 'style' => array() ),
								)
							) . '</p>
							<p style="margin-top: 32%;"><i><b>' . esc_html__( 'Note:', 'miniorange-otp-verification' ) . '</b> ' . esc_html__( 'There is an additional 18% GST applicable via Bank Transfer.', 'miniorange-otp-verification' ) . '</i></p>
						</div>
					</div>
				</div>
			</div>
			<div class="mo_otp_note px-mo-8 pb-mo-4 mx-mo-16 my-mo-4">
				<p><b>' . esc_html__( 'Note :', 'miniorange-otp-verification' ) . '</b> ' . esc_html__( 'Once you have paid through Net Banking, please inform us so that we can confirm and update your License.', 'miniorange-otp-verification' ) . '</p>
				<p>' . wp_kses(
					sprintf(
							/* translators: %s: Link to Supported Payment Methods page */
						__( 'For more information about payment methods visit %s', 'miniorange-otp-verification' ),
						'<i><u><a href="' . esc_url( MoConstants::FAQ_PAY_URL ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Supported Payment Methods.', 'miniorange-otp-verification' ) . '</a></u></i>'
					),
					array(
						'i' => array(),
						'u' => array(),
						'a' => array(
							'href'   => array(),
							'target' => array(),
							'rel'    => array(),
						),
					)
				) . '</p>
			</div>
		</div>
	</div>
	<div class="m-mo-4 border dark:border-gray-700" >
		<div class="mo-header">
			<p class="mo-heading flex-1 mt-mo-2">' . esc_html( __( 'Refund and Privacy Policy', 'miniorange-otp-verification' ) ) . '</p>        
		</div>
		<div class="mo_otp_note px-mo-8 pb-mo-4 mx-mo-16 my-mo-4">
			<p><b>' . esc_html__( 'Note :', 'miniorange-otp-verification' ) . '</b> ' . wp_kses(
				sprintf(
					/* translators: 1: Link to Refund Policy, 2: Link to Plugin Privacy Policy */
					__( 'Please read the %1$s and %2$s before upgrading to any plan.', 'miniorange-otp-verification' ),
					'<i><u><a class="font-semibold" href="' . esc_url( apply_filters( 'mo_otp_refund_policy_url', 'https://plugins.miniorange.com/end-user-license-agreement#v5-software-warranty-refund-policy' ) ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Refund Policy', 'miniorange-otp-verification' ) . '</a></u></i>',
					'<i><u><a class="font-semibold" href="' . esc_url( apply_filters( 'mo_otp_privacy_url', 'https://plugins.miniorange.com/wp-content/uploads/2023/08/Plugins-Privacy-Policy.pdf' ) ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Plugin Privacy Policy', 'miniorange-otp-verification' ) . '</a></u></i>'
				),
				array(
					'i' => array(),
					'u' => array(),
					'a' => array(
						'href'   => array(),
						'target' => array(),
						'rel'    => array(),
						'class'  => array(),
					),
				)
			) . '</p>
		</div>
	</div>
	
	<form style="display:none;" id="mo_upgrade_form" action="' . esc_url( $portal_host ) . '" target="_blank" method="post">
		<input type="text" name="requestOrigin" id="requestOriginUpgrade"  />
		<input type="text" name="payment_referer" value="' . esc_url( admin_url() ) . 'admin.php?page=mootppricing">
	</form>

	<form id="mo_ln_form" style="display:none;" action="" method="post">';

		wp_nonce_field( $nonce );

	echo '<input type="hidden" name="option" value="check_mo_ln" />
	</form>';

// Register and enqueue the pricing page script.
$script_handle = 'mo-pricing';
if ( ! wp_script_is( $script_handle, 'registered' ) ) {
	wp_register_script(
		$script_handle,
		MOV_URL . 'includes/js/mo-pricing.js',
		array( 'jquery' ),
		MOV_VERSION,
		true
	);
}

// Enqueue script.
wp_enqueue_script( $script_handle );
