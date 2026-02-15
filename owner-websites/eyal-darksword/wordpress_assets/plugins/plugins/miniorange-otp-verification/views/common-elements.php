<?php
/**
 * Load user view for admin panel.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\CountryList;
use OTP\Helper\FormList;
use OTP\Helper\PremiumFeatureList;
use OTP\Helper\GatewayFunctions;
use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;
use OTP\Helper\Templates\DefaultPopup;
use OTP\Helper\Templates\ErrorPopup;
use OTP\Helper\Templates\ExternalPopup;
use OTP\Helper\Templates\UserChoicePopup;
use OTP\Objects\TabDetails;
use OTP\Objects\Tabs;

/**
 * This displays a link next to the name of each of the forms under the
 * forms tab so that user can see if the form in question is the correct
 * form.
 * Also adds A link to Guide and Video Tutorial if any.
 *
 * @param  array $formalink -   array of the link to the forms main page['formLink'],
 *                              guide Link['guideLink] and Video Tutotial['videoLink].
 */
function get_plugin_form_link( $formalink ) {
	$req_url         = admin_url( 'admin.php' );
	$limit_otp_addon = add_query_arg(
		array(
			'page'  => 'addon',
			'addon' => 'otp_control',
		),
		$req_url
	);
	echo '<div class="my-mo-10 border-l border-lightgrey-500">';
	if ( MoUtility::sanitize_check( 'formLink', $formalink ) ) {
		echo '<div class="flex gap-mo-1 pl-mo-2 py-mo-4" >
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M14.75 2.5C14.75 2.08579 14.4142 1.75 14 1.75C13.5858 1.75 13.25 2.08579 13.25 2.5V4.80003L13.25 4.83046V4.83048C13.25 5.36463 13.25 5.81047 13.2797 6.1747C13.3108 6.55458 13.3779 6.91124 13.5497 7.2485C13.8134 7.76595 14.2341 8.18665 14.7515 8.4503C15.0888 8.62214 15.4454 8.68925 15.8253 8.72029C16.1896 8.75005 16.6354 8.75004 17.1696 8.75003H17.2H19.5C19.9142 8.75003 20.25 8.41424 20.25 8.00003C20.25 7.58582 19.9142 7.25003 19.5 7.25003H17.2C16.6276 7.25003 16.2434 7.24945 15.9475 7.22527C15.6604 7.20181 15.5231 7.15993 15.4325 7.11379C15.1973 6.99395 15.0061 6.80272 14.8862 6.56752C14.8401 6.47696 14.7982 6.33967 14.7748 6.05255C14.7506 5.75667 14.75 5.37246 14.75 4.80003V2.5ZM8.25 12C8.25 11.5858 8.58579 11.25 9 11.25H15C15.4142 11.25 15.75 11.5858 15.75 12C15.75 12.4142 15.4142 12.75 15 12.75H9C8.58579 12.75 8.25 12.4142 8.25 12ZM8.25 16C8.25 15.5858 8.58579 15.25 9 15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H9C8.58579 16.75 8.25 16.4142 8.25 16Z" fill="#22272F"/>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M13.8489 2.85078C13.4131 2.75415 12.9434 2.75001 11.7782 2.75001C10.4711 2.75001 9.53262 2.75051 8.79411 2.80645C8.06343 2.86178 7.58979 2.96822 7.20363 3.14832C6.29825 3.57057 5.57056 4.29827 5.1483 5.20364C4.9682 5.58981 4.86177 6.06344 4.80643 6.79413C4.7505 7.53263 4.75 8.47115 4.75 9.77819V14C4.75 15.4125 4.75058 16.4268 4.81563 17.2229C4.87996 18.0103 5.00359 18.518 5.21322 18.9295C5.62068 19.7292 6.27085 20.3793 7.07054 20.7868C7.48197 20.9964 7.9897 21.1201 8.77708 21.1844C9.57322 21.2494 10.5875 21.25 12 21.25C13.4125 21.25 14.4268 21.2494 15.2229 21.1844C16.0103 21.1201 16.518 20.9964 16.9295 20.7868C17.7291 20.3793 18.3793 19.7292 18.7868 18.9295C18.9964 18.518 19.12 18.0103 19.1844 17.2229C19.2494 16.4268 19.25 15.4125 19.25 14V10.3137C19.25 9.05507 19.2452 8.54798 19.1326 8.07894C19.0285 7.64528 18.8567 7.23072 18.6237 6.85046C18.3717 6.43917 18.0165 6.0772 17.1265 5.1872L16.7478 4.80852C15.9239 3.98455 15.5888 3.65537 15.2123 3.41553C14.7943 3.14921 14.3329 2.95808 13.8489 2.85078ZM11.8699 1.25001C12.9147 1.24989 13.5579 1.24983 14.1736 1.38635C14.8284 1.53152 15.4526 1.79011 16.0183 2.15042C16.5502 2.48926 17.0049 2.94412 17.7437 3.68301C17.765 3.70439 17.7866 3.726 17.8085 3.74786L18.1872 4.12654C18.2108 4.15014 18.2341 4.17348 18.2572 4.19655C19.0552 4.9944 19.5466 5.48565 19.9027 6.06671C20.2179 6.58118 20.4503 7.14206 20.5911 7.72877C20.7502 8.39143 20.7501 9.08624 20.75 10.2147C20.75 10.2473 20.75 10.2803 20.75 10.3137V14V14.0336C20.75 15.4053 20.75 16.4807 20.6794 17.3451C20.6075 18.2252 20.4586 18.9523 20.1233 19.6105C19.572 20.6924 18.6924 21.572 17.6104 22.1233C16.9523 22.4586 16.2252 22.6075 15.3451 22.6794C14.4807 22.75 13.4053 22.75 12.0336 22.75H12H11.9664C10.5947 22.75 9.51928 22.75 8.65494 22.6794C7.77479 22.6075 7.04769 22.4586 6.38955 22.1233C5.30762 21.572 4.42798 20.6924 3.87671 19.6105C3.54138 18.9523 3.39252 18.2252 3.32061 17.3451C3.24999 16.4807 3.25 15.4053 3.25 14.0336L3.25 14V9.77819L3.25 9.74718C3.25 8.47782 3.24999 7.48261 3.31072 6.68085C3.37252 5.86474 3.50039 5.18821 3.78888 4.56963C4.36017 3.34471 5.3447 2.36018 6.56962 1.78889C7.18819 1.5004 7.86473 1.37254 8.68083 1.31073C9.4826 1.25001 10.4778 1.25001 11.7472 1.25001L11.7782 1.25001C11.8091 1.25001 11.8396 1.25001 11.8699 1.25001Z" fill="#22272F"/>
				</svg>
				<a class="mo-form-links"
					href="' . esc_url( $formalink['formLink'] ) . '"
					title="' . esc_attr( $formalink['formLink'] ) . '"
					id="formLink"  
					target="_blank" rel="noopener noreferrer">
					' . esc_html__( 'FormLink', 'miniorange-otp-verification' ) . '
				</a>
			</div>';
	}
	if ( MoUtility::sanitize_check( 'guideLink', $formalink ) ) {
		echo '<div class="flex gap-mo-1 pl-mo-2 py-mo-4">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M2.25 19.5C2.25 19.0858 2.58579 18.75 3 18.75C5.02623 18.75 6.60313 18.8757 8.07234 19.2764C9.41499 19.6426 10.6314 20.2283 12 21.1041C13.3686 20.2283 14.585 19.6426 15.9277 19.2764C17.3969 18.8757 18.9738 18.75 21 18.75C21.4142 18.75 21.75 19.0858 21.75 19.5C21.75 19.9142 21.4142 20.25 21 20.25C19.0262 20.25 17.6031 20.3743 16.3223 20.7236C15.0494 21.0707 13.8738 21.6522 12.416 22.624C12.1641 22.792 11.8359 22.792 11.584 22.624C10.1262 21.6522 8.95056 21.0707 7.67766 20.7236C6.39687 20.3743 4.97377 20.25 3 20.25C2.58579 20.25 2.25 19.9142 2.25 19.5Z" fill="#22272F"/>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M21.9462 1.25L22 1.25C22.4142 1.25 22.75 1.58579 22.75 2V12.6571V12.6866C22.75 13.2123 22.75 13.6501 22.722 14.0072C22.6928 14.3786 22.6298 14.728 22.4671 15.0585C22.2126 15.5753 21.8306 15.9751 21.3258 16.2528C20.9986 16.4329 20.6396 16.5109 20.2578 16.5568C19.8861 16.6016 19.4236 16.6226 18.8626 16.6482L18.8339 16.6495C16.4047 16.76 14.701 17.1552 12.4056 18.6309C12.1585 18.7897 11.8415 18.7897 11.5944 18.6309C9.29896 17.1552 7.59527 16.76 5.16613 16.6495L5.13741 16.6482C4.57637 16.6226 4.11388 16.6016 3.74223 16.5568C3.3604 16.5109 3.00136 16.4329 2.67415 16.2528C2.16945 15.9751 1.78743 15.5753 1.53292 15.0585C1.37018 14.728 1.30718 14.3786 1.27802 14.0072C1.24998 13.6501 1.24999 13.2122 1.25 12.6866L1.25 12.6571V2C1.25 1.80109 1.32902 1.61032 1.46967 1.46967C1.61032 1.32902 1.80109 1.25 2 1.25L2.05378 1.25C4.23099 1.24998 5.95395 1.24997 7.54619 1.52913C9.05461 1.79359 10.4311 2.30412 12 3.25821C13.5689 2.30412 14.9454 1.79359 16.4538 1.52912C18.0461 1.24997 19.769 1.24998 21.9462 1.25ZM11.25 4.55773C9.8118 3.67896 8.60209 3.23713 7.28715 3.00659C6.00403 2.78163 4.60749 2.75388 2.75 2.75048V12.6571C2.75 13.2198 2.75054 13.5984 2.77342 13.8898C2.7957 14.1736 2.83559 14.3084 2.8786 14.3958C2.99728 14.6368 3.16199 14.8092 3.39734 14.9387C3.47818 14.9832 3.61591 15.0308 3.92156 15.0676C4.23108 15.1049 4.63737 15.1239 5.23434 15.151C7.46482 15.2526 9.21803 15.5917 11.25 16.6851V4.55773ZM12.75 16.6851C14.782 15.5917 16.5352 15.2526 18.7657 15.151C19.3626 15.1239 19.7689 15.1049 20.0784 15.0676C20.3841 15.0308 20.5218 14.9832 20.6027 14.9387C20.838 14.8092 21.0027 14.6368 21.1214 14.3958C21.1644 14.3084 21.2043 14.1736 21.2266 13.8898C21.2495 13.5984 21.25 13.2198 21.25 12.6571V2.75048C19.3925 2.75388 17.996 2.78163 16.7129 3.00659C15.3979 3.23713 14.1882 3.67896 12.75 4.55773V16.6851Z" fill="#22272F"/>
				</svg>
				<a class="mo-form-links"
					href="' . esc_url( $formalink['guideLink'] ) . '"
					title="Instruction Guide"
					id="guideLink"  
					target="_blank" rel="noopener noreferrer">
					' . esc_html__( 'Setup Guide', 'miniorange-otp-verification' ) . '
				</a>
			</div>';
	}
	if ( MoUtility::sanitize_check( 'videoLink', $formalink ) ) {
		echo '<div class="flex gap-mo-1 pl-mo-2 py-mo-4">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" >
					<path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M20.8902 6.83426C22.0071 6.51978 23.18 7.1062 23.5985 8.1884C23.6941 8.43544 23.723 8.70695 23.7364 8.96898C23.75 9.23431 23.75 9.57029 23.75 9.97937L23.75 10.0001L23.75 14.0001L23.75 14.0208C23.75 14.4298 23.75 14.7658 23.7364 15.0311C23.723 15.2932 23.6941 15.5647 23.5985 15.8117C23.18 16.8939 22.0071 17.4803 20.8902 17.1659C20.6353 17.0941 20.4007 16.9543 20.183 16.8078C19.9626 16.6595 19.6938 16.4579 19.3666 16.2125L19.35 16.2001C19.3388 16.1916 19.3276 16.1833 19.3165 16.1749C19.1542 16.0534 19.0118 15.9467 18.889 15.8208C18.5628 15.4862 18.3488 15.0582 18.2769 14.5964C18.2498 14.4227 18.2499 14.2451 18.25 14.0429C18.25 14.0292 18.25 14.0153 18.25 14.0012L18.25 13.9955L18.25 13.9897L18.25 13.9839L18.25 13.9781L18.25 13.9723L18.25 13.9665L18.25 13.9606L18.25 13.9548L18.25 13.9489L18.25 13.9431L18.25 13.9372L18.25 13.9313L18.25 13.9253L18.25 13.9194L18.25 13.9135L18.25 13.9075L18.25 13.9016L18.25 13.8956L18.25 13.8896L18.25 13.8836L18.25 13.8776L18.25 13.8715L18.25 13.8655L18.25 13.8594L18.25 13.8534L18.25 13.8473L18.25 13.8412L18.25 13.8351L18.25 13.829L18.25 13.8229L18.25 13.8167L18.25 13.8106L18.25 13.8044L18.25 13.7982L18.25 13.792L18.25 13.7858L18.25 13.7796L18.25 13.7734L18.25 13.7671L18.25 13.7609L18.25 13.7546L18.25 13.7484L18.25 13.7421L18.25 13.7358L18.25 13.7295L18.25 13.7231L18.25 13.7168L18.25 13.7105L18.25 13.7041L18.25 13.6977L18.25 13.6913L18.25 13.685L18.25 13.6785L18.25 13.6721L18.25 13.6657L18.25 13.6593L18.25 13.6528L18.25 13.6464L18.25 13.6399L18.25 13.6334L18.25 13.6269L18.25 13.6204L18.25 13.6139L18.25 13.6073L18.25 13.6008L18.25 13.5942L18.25 13.5877L18.25 13.5811L18.25 13.5745L18.25 13.5679L18.25 13.5613L18.25 13.5547L18.25 13.5481L18.25 13.5414L18.25 13.5348L18.25 13.5281L18.25 13.5214L18.25 13.5147L18.25 13.508L18.25 13.5013L18.25 13.4946L18.25 13.4879L18.25 13.4811L18.25 13.4744L18.25 13.4676L18.25 13.4609L18.25 13.4541L18.25 13.4473L18.25 13.4405L18.25 13.4337L18.25 13.4268L18.25 13.42L18.25 13.4132L18.25 13.4063L18.25 13.3994L18.25 13.3926L18.25 13.3857L18.25 13.3788L18.25 13.3719L18.25 13.365L18.25 13.358L18.25 13.3511L18.25 13.3441L18.25 13.3372L18.25 13.3302L18.25 13.3232L18.25 13.3163L18.25 13.3093L18.25 13.3022L18.25 13.2952L18.25 13.2882L18.25 13.2812L18.25 13.2741L18.25 13.2671L18.25 13.26L18.25 13.2529L18.25 13.2458L18.25 13.2387L18.25 13.2316L18.25 13.2245L18.25 13.2174L18.25 13.2102L18.25 13.2031L18.25 13.1959L18.25 13.1888L18.25 13.1816L18.25 13.1744L18.25 13.1672L18.25 13.16L18.25 13.1528L18.25 13.1456L18.25 13.1384L18.25 13.1311L18.25 13.1239L18.25 13.1166L18.25 13.1094L18.25 13.1021L18.25 13.0948L18.25 13.0875L18.25 13.0802L18.25 13.0729L18.25 13.0656L18.25 13.0583L18.25 13.0509L18.25 13.0436L18.25 13.0362L18.25 13.0289L18.25 13.0215L18.25 13.0141L18.25 13.0067L18.25 12.9993L18.25 12.9919L18.25 12.9845L18.25 12.9771L18.25 12.9696L18.25 12.9622L18.25 12.9547L18.25 12.9473L18.25 12.9398L18.25 12.9323L18.25 12.9248L18.25 12.9174L18.25 12.9099L18.25 12.9023L18.25 12.8948L18.25 12.8873L18.25 12.8798L18.25 12.8722L18.25 12.8647L18.25 12.8571L18.25 12.8495L18.25 12.842L18.25 12.8344L18.25 12.8268L18.25 12.8192L18.25 12.8116L18.25 12.804L18.25 12.7964L18.25 12.7887L18.25 12.7811L18.25 12.7734L18.25 12.7658L18.25 12.7581L18.25 12.7505L18.25 12.7428L18.25 12.7351L18.25 12.7274L18.25 12.7197L18.25 12.712L18.25 12.7043L18.25 12.6966L18.25 12.6888L18.25 12.6811L18.25 12.6734L18.25 12.6656L18.25 12.6579L18.25 12.6501L18.25 12.6423L18.25 12.6345L18.25 12.6267L18.25 12.619L18.25 12.6112L18.25 12.6033L18.25 12.5955L18.25 12.5877L18.25 12.5799L18.25 12.572L18.25 12.5642L18.25 12.5563L18.25 12.5485L18.25 12.5406L18.25 12.5327L18.25 12.5249L18.25 12.517L18.25 12.5091L18.25 12.5012L18.25 12.4933L18.25 12.4854L18.25 12.4775L18.25 12.4695L18.25 12.4616L18.25 12.4537L18.25 12.4457L18.25 12.4378L18.25 12.4298L18.25 12.4218L18.25 12.4139L18.25 12.4059L18.25 12.3979L18.25 12.3899L18.25 12.3819L18.25 12.3739L18.25 12.3659L18.25 12.3579L18.25 12.3499L18.25 12.3419L18.25 12.3338L18.25 12.3258L18.25 12.3177L18.25 12.3097L18.25 12.3016L18.25 12.2936L18.25 12.2855L18.25 12.2774L18.25 12.2694L18.25 12.2613L18.25 12.2532L18.25 12.2451L18.25 12.237L18.25 12.2289L18.25 12.2208L18.25 12.2126L18.25 12.2045L18.25 12.1964L18.25 12.1882L18.25 12.1801L18.25 12.1719L18.25 12.1638L18.25 12.1556L18.25 12.1475L18.25 12.1393L18.25 12.1311L18.25 12.1229L18.25 12.1148L18.25 12.1066L18.25 12.0984L18.25 12.0902L18.25 12.082L18.25 12.0738L18.25 12.0655L18.25 12.0573L18.25 12.0491L18.25 12.0409L18.25 12.0326L18.25 12.0244L18.25 12.0161L18.25 12.0079L18.25 11.9996L18.25 11.9914L18.25 11.9831L18.25 11.9748L18.25 11.9666L18.25 11.9583L18.25 11.95L18.25 11.9417L18.25 11.9334L18.25 11.9251L18.25 11.9168L18.25 11.9085L18.25 11.9002L18.25 11.8919L18.25 11.8836L18.25 11.8752L18.25 11.8669L18.25 11.8586L18.25 11.8502L18.25 11.8419L18.25 11.8335L18.25 11.8252L18.25 11.8168L18.25 11.8085L18.25 11.8001L18.25 11.7917L18.25 11.7834L18.25 11.775L18.25 11.7666L18.25 11.7582L18.25 11.7499L18.25 11.7415L18.25 11.7331L18.25 11.7247L18.25 11.7163L18.25 11.7079L18.25 11.6994L18.25 11.691L18.25 11.6826L18.25 11.6742L18.25 11.6658L18.25 11.6573L18.25 11.6489L18.25 11.6405L18.25 11.632L18.25 11.6236L18.25 11.6151L18.25 11.6067L18.25 11.5982L18.25 11.5898L18.25 11.5813L18.25 11.5729L18.25 11.5644L18.25 11.5559L18.25 11.5475L18.25 11.539L18.25 11.5305L18.25 11.522L18.25 11.5135L18.25 11.5051L18.25 11.4966L18.25 11.4881L18.25 11.4796L18.25 11.4711L18.25 11.4626L18.25 11.4541L18.25 11.4456L18.25 11.437L18.25 11.4285L18.25 11.42L18.25 11.4115L18.25 11.403L18.25 11.3944L18.25 11.3859L18.25 11.3774L18.25 11.3689L18.25 11.3603L18.25 11.3518L18.25 11.3432L18.25 11.3347L18.25 11.3262L18.25 11.3176L18.25 11.3091L18.25 11.3005L18.25 11.2919L18.25 11.2834L18.25 11.2748L18.25 11.2663L18.25 11.2577L18.25 11.2491L18.25 11.2406L18.25 11.232L18.25 11.2234L18.25 11.2149L18.25 11.2063L18.25 11.1977L18.25 11.1891L18.25 11.1805L18.25 11.172L18.25 11.1634L18.25 11.1548L18.25 11.1462L18.25 11.1376L18.25 11.129L18.25 11.1204L18.25 11.1118L18.25 11.1032L18.25 11.0946L18.25 11.086L18.25 11.0774L18.25 11.0688L18.25 11.0602L18.25 11.0516L18.25 11.043L18.25 11.0344L18.25 11.0258L18.25 11.0172L18.25 11.0086L18.25 10.9999L18.25 10.9913L18.25 10.9827L18.25 10.9741L18.25 10.9655L18.25 10.9568L18.25 10.9482L18.25 10.9396L18.25 10.931L18.25 10.9223L18.25 10.9137L18.25 10.9051L18.25 10.8965L18.25 10.8878L18.25 10.8792L18.25 10.8706L18.25 10.8619L18.25 10.8533L18.25 10.8447L18.25 10.8361L18.25 10.8274L18.25 10.8188L18.25 10.8101L18.25 10.8015L18.25 10.7929L18.25 10.7842L18.25 10.7756L18.25 10.767L18.25 10.7583L18.25 10.7497L18.25 10.741L18.25 10.7324L18.25 10.7238L18.25 10.7151L18.25 10.7065L18.25 10.6978L18.25 10.6892L18.25 10.6806L18.25 10.6719L18.25 10.6633L18.25 10.6546L18.25 10.646L18.25 10.6374L18.25 10.6287L18.25 10.6201L18.25 10.6114L18.25 10.6028L18.25 10.5942L18.25 10.5855L18.25 10.5769L18.25 10.5682L18.25 10.5596L18.25 10.551L18.25 10.5423L18.25 10.5337L18.25 10.525L18.25 10.5164L18.25 10.5078L18.25 10.4991L18.25 10.4905L18.25 10.4819L18.25 10.4732L18.25 10.4646L18.25 10.4559L18.25 10.4473L18.25 10.4387L18.25 10.4301L18.25 10.4214L18.25 10.4128L18.25 10.4042L18.25 10.3955L18.25 10.3869L18.25 10.3783L18.25 10.3696L18.25 10.361L18.25 10.3524L18.25 10.3438L18.25 10.3352L18.25 10.3265L18.25 10.3179L18.25 10.3093L18.25 10.3007L18.25 10.2921L18.25 10.2834L18.25 10.2748L18.25 10.2662L18.25 10.2576L18.25 10.249L18.25 10.2404L18.25 10.2318L18.25 10.2232L18.25 10.2146L18.25 10.206L18.25 10.1974L18.25 10.1888L18.25 10.1802L18.25 10.1716L18.25 10.163L18.25 10.1544L18.25 10.1458L18.25 10.1372L18.25 10.1286L18.25 10.12L18.25 10.1114L18.25 10.1029L18.25 10.0943L18.25 10.0857L18.25 10.0771L18.25 10.0686L18.25 10.06L18.25 10.0514L18.25 10.0428L18.25 10.0343L18.25 10.0257L18.25 10.0172L18.25 10.0086L18.25 10C18.25 9.98595 18.25 9.97198 18.25 9.95813C18.2499 9.75541 18.2498 9.57747 18.2769 9.40372C18.3488 8.94192 18.5628 8.51399 18.889 8.17935C19.0118 8.05345 19.1542 7.94676 19.3165 7.82522C19.3275 7.81691 19.3387 7.80854 19.35 7.80009L19.3666 7.78766C19.6938 7.54221 19.9626 7.34062 20.183 7.19231C20.4007 7.04585 20.6353 6.90605 20.8902 6.83426ZM22.1995 8.72949C22.06 8.36876 21.6691 8.17329 21.2968 8.27812C21.2822 8.28221 21.2114 8.30835 21.0203 8.43686C20.8358 8.56104 20.5979 8.73914 20.25 9.00007C20.0357 9.1608 19.994 9.19469 19.963 9.22649C19.8543 9.33804 19.783 9.48068 19.759 9.63462C19.7521 9.67851 19.75 9.73217 19.75 10L19.75 10.0086L19.75 10.0172L19.75 10.0257L19.75 10.0343L19.75 10.0428L19.75 10.0514L19.75 10.06L19.75 10.0686L19.75 10.0771L19.75 10.0857L19.75 10.0943L19.75 10.1029L19.75 10.1114L19.75 10.12L19.75 10.1286L19.75 10.1372L19.75 10.1458L19.75 10.1544L19.75 10.163L19.75 10.1716L19.75 10.1802L19.75 10.1888L19.75 10.1974L19.75 10.206L19.75 10.2146L19.75 10.2232L19.75 10.2318L19.75 10.2404L19.75 10.249L19.75 10.2576L19.75 10.2662L19.75 10.2748L19.75 10.2834L19.75 10.2921L19.75 10.3007L19.75 10.3093L19.75 10.3179L19.75 10.3265L19.75 10.3352L19.75 10.3438L19.75 10.3524L19.75 10.361L19.75 10.3696L19.75 10.3783L19.75 10.3869L19.75 10.3955L19.75 10.4042L19.75 10.4128L19.75 10.4214L19.75 10.4301L19.75 10.4387L19.75 10.4473L19.75 10.4559L19.75 10.4646L19.75 10.4732L19.75 10.4819L19.75 10.4905L19.75 10.4991L19.75 10.5078L19.75 10.5164L19.75 10.525L19.75 10.5337L19.75 10.5423L19.75 10.551L19.75 10.5596L19.75 10.5682L19.75 10.5769L19.75 10.5855L19.75 10.5942L19.75 10.6028L19.75 10.6114L19.75 10.6201L19.75 10.6287L19.75 10.6374L19.75 10.646L19.75 10.6546L19.75 10.6633L19.75 10.6719L19.75 10.6806L19.75 10.6892L19.75 10.6978L19.75 10.7065L19.75 10.7151L19.75 10.7238L19.75 10.7324L19.75 10.741L19.75 10.7497L19.75 10.7583L19.75 10.767L19.75 10.7756L19.75 10.7842L19.75 10.7929L19.75 10.8015L19.75 10.8101L19.75 10.8188L19.75 10.8274L19.75 10.8361L19.75 10.8447L19.75 10.8533L19.75 10.8619L19.75 10.8706L19.75 10.8792L19.75 10.8878L19.75 10.8965L19.75 10.9051L19.75 10.9137L19.75 10.9223L19.75 10.931L19.75 10.9396L19.75 10.9482L19.75 10.9568L19.75 10.9655L19.75 10.9741L19.75 10.9827L19.75 10.9913L19.75 10.9999L19.75 11.0086L19.75 11.0172L19.75 11.0258L19.75 11.0344L19.75 11.043L19.75 11.0516L19.75 11.0602L19.75 11.0688L19.75 11.0774L19.75 11.086L19.75 11.0946L19.75 11.1032L19.75 11.1118L19.75 11.1204L19.75 11.129L19.75 11.1376L19.75 11.1462L19.75 11.1548L19.75 11.1634L19.75 11.172L19.75 11.1805L19.75 11.1891L19.75 11.1977L19.75 11.2063L19.75 11.2149L19.75 11.2234L19.75 11.232L19.75 11.2406L19.75 11.2491L19.75 11.2577L19.75 11.2663L19.75 11.2748L19.75 11.2834L19.75 11.2919L19.75 11.3005L19.75 11.3091L19.75 11.3176L19.75 11.3262L19.75 11.3347L19.75 11.3432L19.75 11.3518L19.75 11.3603L19.75 11.3689L19.75 11.3774L19.75 11.3859L19.75 11.3944L19.75 11.403L19.75 11.4115L19.75 11.42L19.75 11.4285L19.75 11.437L19.75 11.4456L19.75 11.4541L19.75 11.4626L19.75 11.4711L19.75 11.4796L19.75 11.4881L19.75 11.4966L19.75 11.5051L19.75 11.5135L19.75 11.522L19.75 11.5305L19.75 11.539L19.75 11.5475L19.75 11.5559L19.75 11.5644L19.75 11.5729L19.75 11.5813L19.75 11.5898L19.75 11.5982L19.75 11.6067L19.75 11.6151L19.75 11.6236L19.75 11.632L19.75 11.6405L19.75 11.6489L19.75 11.6573L19.75 11.6658L19.75 11.6742L19.75 11.6826L19.75 11.691L19.75 11.6994L19.75 11.7079L19.75 11.7163L19.75 11.7247L19.75 11.7331L19.75 11.7415L19.75 11.7499L19.75 11.7582L19.75 11.7666L19.75 11.775L19.75 11.7834L19.75 11.7917L19.75 11.8001L19.75 11.8085L19.75 11.8168L19.75 11.8252L19.75 11.8335L19.75 11.8419L19.75 11.8502L19.75 11.8586L19.75 11.8669L19.75 11.8752L19.75 11.8836L19.75 11.8919L19.75 11.9002L19.75 11.9085L19.75 11.9168L19.75 11.9251L19.75 11.9334L19.75 11.9417L19.75 11.95L19.75 11.9583L19.75 11.9666L19.75 11.9748L19.75 11.9831L19.75 11.9914L19.75 11.9996L19.75 12.0079L19.75 12.0161L19.75 12.0244L19.75 12.0326L19.75 12.0409L19.75 12.0491L19.75 12.0573L19.75 12.0655L19.75 12.0738L19.75 12.082L19.75 12.0902L19.75 12.0984L19.75 12.1066L19.75 12.1148L19.75 12.1229L19.75 12.1311L19.75 12.1393L19.75 12.1475L19.75 12.1556L19.75 12.1638L19.75 12.1719L19.75 12.1801L19.75 12.1882L19.75 12.1964L19.75 12.2045L19.75 12.2126L19.75 12.2208L19.75 12.2289L19.75 12.237L19.75 12.2451L19.75 12.2532L19.75 12.2613L19.75 12.2694L19.75 12.2774L19.75 12.2855L19.75 12.2936L19.75 12.3016L19.75 12.3097L19.75 12.3177L19.75 12.3258L19.75 12.3338L19.75 12.3419L19.75 12.3499L19.75 12.3579L19.75 12.3659L19.75 12.3739L19.75 12.3819L19.75 12.3899L19.75 12.3979L19.75 12.4059L19.75 12.4139L19.75 12.4218L19.75 12.4298L19.75 12.4378L19.75 12.4457L19.75 12.4537L19.75 12.4616L19.75 12.4695L19.75 12.4775L19.75 12.4854L19.75 12.4933L19.75 12.5012L19.75 12.5091L19.75 12.517L19.75 12.5249L19.75 12.5327L19.75 12.5406L19.75 12.5485L19.75 12.5563L19.75 12.5642L19.75 12.572L19.75 12.5799L19.75 12.5877L19.75 12.5955L19.75 12.6033L19.75 12.6112L19.75 12.619L19.75 12.6267L19.75 12.6345L19.75 12.6423L19.75 12.6501L19.75 12.6579L19.75 12.6656L19.75 12.6734L19.75 12.6811L19.75 12.6888L19.75 12.6966L19.75 12.7043L19.75 12.712L19.75 12.7197L19.75 12.7274L19.75 12.7351L19.75 12.7428L19.75 12.7505L19.75 12.7581L19.75 12.7658L19.75 12.7734L19.75 12.7811L19.75 12.7887L19.75 12.7964L19.75 12.804L19.75 12.8116L19.75 12.8192L19.75 12.8268L19.75 12.8344L19.75 12.842L19.75 12.8495L19.75 12.8571L19.75 12.8647L19.75 12.8722L19.75 12.8798L19.75 12.8873L19.75 12.8948L19.75 12.9023L19.75 12.9099L19.75 12.9174L19.75 12.9248L19.75 12.9323L19.75 12.9398L19.75 12.9473L19.75 12.9547L19.75 12.9622L19.75 12.9696L19.75 12.9771L19.75 12.9845L19.75 12.9919L19.75 12.9993L19.75 13.0067L19.75 13.0141L19.75 13.0215L19.75 13.0289L19.75 13.0362L19.75 13.0436L19.75 13.0509L19.75 13.0583L19.75 13.0656L19.75 13.0729L19.75 13.0802L19.75 13.0875L19.75 13.0948L19.75 13.1021L19.75 13.1094L19.75 13.1166L19.75 13.1239L19.75 13.1311L19.75 13.1384L19.75 13.1456L19.75 13.1528L19.75 13.16L19.75 13.1672L19.75 13.1744L19.75 13.1816L19.75 13.1888L19.75 13.1959L19.75 13.2031L19.75 13.2102L19.75 13.2174L19.75 13.2245L19.75 13.2316L19.75 13.2387L19.75 13.2458L19.75 13.2529L19.75 13.26L19.75 13.2671L19.75 13.2741L19.75 13.2812L19.75 13.2882L19.75 13.2952L19.75 13.3022L19.75 13.3093L19.75 13.3163L19.75 13.3232L19.75 13.3302L19.75 13.3372L19.75 13.3441L19.75 13.3511L19.75 13.358L19.75 13.365L19.75 13.3719L19.75 13.3788L19.75 13.3857L19.75 13.3926L19.75 13.3994L19.75 13.4063L19.75 13.4132L19.75 13.42L19.75 13.4268L19.75 13.4337L19.75 13.4405L19.75 13.4473L19.75 13.4541L19.75 13.4609L19.75 13.4676L19.75 13.4744L19.75 13.4811L19.75 13.4879L19.75 13.4946L19.75 13.5013L19.75 13.508L19.75 13.5147L19.75 13.5214L19.75 13.5281L19.75 13.5348L19.75 13.5414L19.75 13.5481L19.75 13.5547L19.75 13.5613L19.75 13.5679L19.75 13.5745L19.75 13.5811L19.75 13.5877L19.75 13.5942L19.75 13.6008L19.75 13.6073L19.75 13.6139L19.75 13.6204L19.75 13.6269L19.75 13.6334L19.75 13.6399L19.75 13.6464L19.75 13.6528L19.75 13.6593L19.75 13.6657L19.75 13.6721L19.75 13.6785L19.75 13.685L19.75 13.6913L19.75 13.6977L19.75 13.7041L19.75 13.7105L19.75 13.7168L19.75 13.7231L19.75 13.7295L19.75 13.7358L19.75 13.7421L19.75 13.7484L19.75 13.7546L19.75 13.7609L19.75 13.7671L19.75 13.7734L19.75 13.7796L19.75 13.7858L19.75 13.792L19.75 13.7982L19.75 13.8044L19.75 13.8106L19.75 13.8167L19.75 13.8229L19.75 13.829L19.75 13.8351L19.75 13.8412L19.75 13.8473L19.75 13.8534L19.75 13.8594L19.75 13.8655L19.75 13.8715L19.75 13.8776L19.75 13.8836L19.75 13.8896L19.75 13.8956L19.75 13.9016L19.75 13.9075L19.75 13.9135L19.75 13.9194L19.75 13.9253L19.75 13.9313L19.75 13.9372L19.75 13.9431L19.75 13.9489L19.75 13.9548L19.75 13.9606L19.75 13.9665L19.75 13.9723L19.75 13.9781L19.75 13.9839L19.75 13.9897L19.75 13.9955L19.75 14.0012C19.75 14.2682 19.7521 14.3216 19.759 14.3655C19.783 14.5195 19.8543 14.6621 19.963 14.7737C19.994 14.8055 20.0357 14.8393 20.25 15.0001C20.5979 15.261 20.8358 15.4391 21.0204 15.5633C21.2114 15.6918 21.2822 15.7179 21.2968 15.722C21.6691 15.8268 22.06 15.6314 22.1995 15.2706C22.205 15.2565 22.2266 15.1842 22.2384 14.9543C22.2498 14.7321 22.25 14.435 22.25 14.0001L22.25 10.0001C22.25 9.56518 22.2498 9.26803 22.2384 9.04587C22.2266 8.81596 22.205 8.74358 22.1995 8.72949Z" fill="#22272F"/>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M8.96644 2.25L9 2.25L11 2.25L11.0336 2.25C12.4053 2.25 13.4807 2.24999 14.3451 2.32061C15.2252 2.39252 15.9523 2.54138 16.6104 2.87671C17.6924 3.42799 18.572 4.30762 19.1233 5.38956C19.4586 6.04769 19.6075 6.7748 19.6794 7.65494C19.75 8.51928 19.75 9.59471 19.75 10.9664L19.75 11L19.75 13L19.75 13.0336C19.75 14.4053 19.75 15.4807 19.6794 16.3451C19.6075 17.2252 19.4586 17.9523 19.1233 18.6104C18.572 19.6924 17.6924 20.572 16.6104 21.1233C15.9523 21.4586 15.2252 21.6075 14.3451 21.6794C13.4807 21.75 12.4053 21.75 11.0336 21.75L11 21.75L9 21.75L8.96642 21.75C7.59471 21.75 6.51928 21.75 5.65493 21.6794C4.77479 21.6075 4.04768 21.4586 3.38955 21.1233C2.30762 20.572 1.42798 19.6924 0.876711 18.6104C0.541377 17.9523 0.392521 17.2252 0.32061 16.3451C0.24999 15.4807 0.249994 14.4053 0.249999 13.0336L0.249999 13L0.249999 11L0.249999 10.9664C0.249994 9.59472 0.24999 8.51929 0.32061 7.65494C0.392521 6.7748 0.541377 6.04769 0.876711 5.38956C1.42798 4.30762 2.30762 3.42799 3.38955 2.87671C4.04768 2.54138 4.77479 2.39252 5.65493 2.32061C6.51928 2.24999 7.59472 2.25 8.96644 2.25ZM5.77708 3.81563C4.9897 3.87996 4.48197 4.00359 4.07054 4.21322C3.27085 4.62069 2.62068 5.27085 2.21322 6.07054C2.00359 6.48197 1.87996 6.98971 1.81563 7.77709C1.75058 8.57322 1.75 9.5875 1.75 11L1.75 13C1.75 14.4125 1.75058 15.4268 1.81563 16.2229C1.87996 17.0103 2.00359 17.518 2.21322 17.9295C2.62068 18.7292 3.27085 19.3793 4.07054 19.7868C4.48197 19.9964 4.9897 20.12 5.77708 20.1844C6.57322 20.2494 7.58749 20.25 9 20.25L11 20.25C12.4125 20.25 13.4268 20.2494 14.2229 20.1844C15.0103 20.12 15.518 19.9964 15.9295 19.7868C16.7291 19.3793 17.3793 18.7292 17.7868 17.9295C17.9964 17.518 18.12 17.0103 18.1844 16.2229C18.2494 15.4268 18.25 14.4125 18.25 13L18.25 11C18.25 9.5875 18.2494 8.57322 18.1844 7.77709C18.12 6.98971 17.9964 6.48197 17.7868 6.07054C17.3793 5.27085 16.7291 4.62069 15.9295 4.21322C15.518 4.00359 15.0103 3.87996 14.2229 3.81563C13.4268 3.75059 12.4125 3.75 11 3.75L9 3.75C7.58749 3.75 6.57322 3.75059 5.77708 3.81563Z" fill="#22272F"/>
				</svg>
				<a class="mo-form-links"
					href="' . esc_url( $formalink['videoLink'] ) . '"
					title="Tutorial Video"
					id="videoLink"  
					target="_blank" rel="noopener noreferrer">
					' . esc_html__( 'Video Tutorial', 'miniorange-otp-verification' ) . '
				</a>
			</div>';
	}
	echo '</div>';
}


/**
 * Display a tooltip with the appropriate header and message on the page
 *
 * @param  string $header  - the header of the tooltip.
 * @param  string $message - the body of the tooltip message.
 */
function mo_draw_tooltip( $header, $message ) {
	// Escape header and message before output.
	echo '  <span class="tooltip">
				<span class="dashicons dashicons-editor-help"></span>
				<span class="tooltiptext">
					<span class="header"><b><i>' . esc_html( $header ) . '</i></b></span><br/><br/>
					<span class="body">' . wp_kses( $message, MoUtility::mo_allow_html_array() ) . '</span>
				</span>
			</span>';
}


/**
 * This is used to display extra post data as hidden fields in the verification
 * page so that it can used later on for processing form data after verification
 * is complete and successful.
 *
 * @return string
 */
function extra_post_data() {
	$form_id = '';
	if ( isset( $_POST['_wpnonce'] ) && wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_wpnonce'] ) ), 'um_login_form' ) ) {
		$form_id = isset( $_POST['form_id'] ) ? MoUtility::sanitize_check( 'form_id', $_POST ) : '';
	}

	$ignore_fields = array(
		'moFields'          => array(
			'option',
			'mo_otp_token',
			'miniorange_otp_token_submit',
			'miniorange-validate-otp-choice-form',
			'submit',
			'mo_customer_validation_otp_choice',
			'register_nonce',
			'timestamp',
			'log',
		),
		'loginOrSocialForm' => array(
			'user_login',
			'user_email',
			'register_nonce',
			'option',
			'register_tml_nonce',
			'mo_otp_token',
			'pwd',
			'password',
			'log',
			'username',
			'user_password-' . $form_id,
			'username-' . $form_id,
		),
	);

	$extra_post_data      = '';
	$login_or_social_form = false;
	$login_or_social_form = apply_filters( 'is_login_or_social_form', $login_or_social_form );
	$fields               = ! $login_or_social_form ? 'moFields' : 'loginOrSocialForm';
	// Sanitize $_POST before iteration to prevent security issues.
	$sanitized_post = MoUtility::mo_sanitize_array( $_POST );
	foreach ( $sanitized_post as $key => $value ) {
		$sanitized_key    = sanitize_key( $key );
		$extra_post_data .= ! in_array( $sanitized_key, $ignore_fields[ $fields ], true ) ? get_hidden_fields( $sanitized_key, $value ) : '';
	}
	return $extra_post_data;
}

/**
 * Show hidden fields. Makes hidden input fields on the page.
 *
 * @param  string $key   - the name attribute of the hidden field.
 * @param  string $value - the value of the input field.
 * @return string
 */
function get_hidden_fields( $key, $value ) {
	if ( 'wordfence_userDat' === $key ) {
		return;
	}
	$hidden_val = '';
	if ( is_array( $value ) ) {
		foreach ( $value as $t => $val ) {
			$hidden_val .= get_hidden_fields( $key . '[' . $t . ']', $val );
		}
	} else {
		$hidden_val .= '<input type="hidden" name="' . esc_attr( $key ) . '" value="' . esc_attr( (string) $value ) . '" />';
	}
	return $hidden_val;
}


/**
 * The HTML code to display the OTP Verification pop up with appropriate messaging
 * and hidden fields for later processing.
 *
 * @param string $user_login the username posted by the user.
 * @param string $user_email the email posted by the user.
 * @param string $phone_number the phone number posted by the user.
 * @param string $message message posted by the user.
 * @param string $otp_type the verification type.
 * @param string $from_both any extra data posted by the user.
 */
function miniorange_site_otp_validation_form( $user_login, $user_email, $phone_number, $message, $otp_type, $from_both ) {
	if ( ! headers_sent() ) {
		header( 'Content-Type: text/html; charset=utf-8' );
	}
	$error_popup_handler   = ErrorPopup::instance();
	$default_popup_handler = DefaultPopup::instance();
	$html_content          = MoUtility::is_blank( $user_email ) && MoUtility::is_blank( $phone_number ) ?
					apply_filters( 'mo_template_build', '', $error_popup_handler->get_template_key(), $message, $otp_type, $from_both )
					: apply_filters( 'mo_template_build', '', $default_popup_handler->get_template_key(), $message, $otp_type, $from_both );
	$html_content          = mo_allow_otp_scripts_only( $html_content );

	echo wp_kses( htmlspecialchars_decode( $html_content ), MoUtility::mo_allow_popup_tags() );
	$default_popup_handler->getCatchyRequiredScripts();
	exit();
}

/**
 * Function filters and allows only specific safe <script> blocks from a given HTML string.
 *
 * @param string $html popup html.
 *
 * @return string The sanitized HTML with only allowed <script> blocks.
 */
function mo_allow_otp_scripts_only( $html ) {
	preg_match_all( '/<script\b[^>]*>(.*?)<\/script>/is', $html, $matches );

	foreach ( $matches[0] as $i => $full_script_tag ) {
		$script_body = $matches[1][ $i ];

		// Allow if it contains any of the OTP pop-up script functions.
		$allow            = false;
		$allowed_patterns = array(
			'mo_validation_goback',
			'mo_otp_verification_resend',
			'mo_select_goback',
			'miniorange-ajax-otp',
		);

		foreach ( $allowed_patterns as $pattern ) {
			if ( strpos( $script_body, $pattern ) !== false ) {
				$allow = true;
				break;
			}
		}

		// Remove disallowed script.
		if ( ! $allow ) {
			$html = str_replace( $full_script_tag, '', $html );
		}
	}

	return $html;
}

/**
 * Display the user choice popup where user can choose between email or
 * sms verification.
 *
 * @param string $user_login the username posted by the user.
 * @param string $user_email the email posted by the user.
 * @param string $phone_number the phone number posted by the user.
 * @param string $message message posted by the user.
 * @param string $otp_type the verification type.
 */
function miniorange_verification_user_choice( $user_login, $user_email, $phone_number, $message, $otp_type ) {
	if ( ! headers_sent() ) {
		header( 'Content-Type: text/html; charset=utf-8' );
	}
	$user_choice_popup = UserChoicePopup::instance();
	$htmlcontent       = apply_filters( 'mo_template_build', '', $user_choice_popup->get_template_key(), $message, $otp_type, true );
	echo wp_kses( htmlspecialchars_decode( $htmlcontent ), MoUtility::mo_allow_popup_tags() );
	exit();
}


/**
 * Display the popup where user has to enter his phone number and then
 * validate the OTP sent to it. This phone number is later stored in the
 *
 * @param string $go_back_url the redirection url on click of go back button.
 * @param string $user_email the email posted by the user.
 * @param string $message message posted by the user.
 * database.
 */
function mo_external_phone_validation_form( $go_back_url, $user_email, $message ) {
	if ( ! headers_sent() ) {
		header( 'Content-Type: text/html; charset=utf-8' );
	}
	$external_pop_up = ExternalPopup::instance();
	$htmlcontent     = apply_filters( 'mo_template_build', '', $external_pop_up->get_template_key(), $message, null, false );

	wp_print_scripts( 'jquery' );
	echo wp_kses( htmlspecialchars_decode( $htmlcontent ), MoUtility::mo_allow_popup_tags() );
	exit();
}

/**
 * Display a dropdown on the page with list of all plugins that are supported.
 */
function get_otp_verification_form_dropdown() {
	$count         = 0;
	$form_handler  = FormList::instance();
	$premium_forms = PremiumFeatureList::instance();
	$premium_forms = $premium_forms->get_premium_forms();
	echo '
		<div class="modropdown px-mo-8" id="modropdown">
			<div class="mo-input-wrapper">
				<label class="mo-input-label">Search and select your Form.</label>
				<input class=" mo-input w-full" placeholder="Enter the name of the form" type="text" id="searchForm" >
			</div>
			<div class="mo-input modropdown-content mb-mo-4" id="formList">';

	$important_form = $form_handler->get_important_forms_list();
	$all_forms      = $form_handler->get_list();

	// To check if the premium form already exists in all forms.
	foreach ( $all_forms as $key => $form ) {
		if ( isset( $premium_forms[ $key ] ) && null !== $premium_forms[ $key ] ) {
				unset( $premium_forms[ $key ] );
		}
	}
	$final_array_list = array_merge( $all_forms, $premium_forms );
	ksort( $final_array_list );

	$final_array = array();
	foreach ( $important_form as $key => $form ) {
		if ( isset( $all_forms[ $form ] ) ) {
			if ( in_array( $all_forms[ $form ]->get_form_key(), $important_form, true ) && ! $all_forms[ $form ]->is_add_on_form() ) {
				array_push( $final_array, $all_forms[ $form ] );
			}
		}
	}

	foreach ( $final_array_list as $key => $form ) {
		if ( isset( $final_array_list[ $key ] ) ) {
			if ( ! in_array( $final_array_list[ $key ], $premium_forms, true ) ) {
				if ( ! in_array( $final_array_list[ $key ]->get_form_key(), $important_form, true ) && ! $final_array_list[ $key ]->is_add_on_form() ) {
					array_push( $final_array, $final_array_list[ $key ] );
				}
			} else {
					array_push( $final_array, $final_array_list[ $key ] );
			}
		}
	}

	foreach ( $final_array as $key => $form ) {
		if ( isset( $final_array[ $key ] ) ) {
			$count = show_all_form_list( $final_array[ $key ], $premium_forms, $count );
		}
	}
	echo ' </div>
		</div>';
}

/**
 * Display a dropdown of list of all the forms.
 *
 * @param object $current_form the form to be preinted.
 * @param array  $premium_forms the list of all the premium forms.
 * @param string $count the serial number of the form.
 */
function show_all_form_list( $current_form, $premium_forms, $count ) {
	$premium_form_image = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
		<g id="d4a43e0162b45f718f49244b403ea8f4">
			<g id="4ea4c3dca364b4cff4fba75ac98abb38">
				<g id="2413972edc07f152c2356073861cb269">
					<path id="2deabe5f8681ff270d3f37797985a977" d="M20.8007 20.5644H3.19925C2.94954 20.5644 2.73449 20.3887 2.68487 20.144L0.194867 7.94109C0.153118 7.73681 0.236091 7.52728 0.406503 7.40702C0.576651 7.28649 0.801941 7.27862 0.980492 7.38627L7.69847 11.4354L11.5297 3.72677C11.6177 3.54979 11.7978 3.43688 11.9955 3.43531C12.1817 3.43452 12.3749 3.54323 12.466 3.71889L16.4244 11.3598L23.0197 7.38654C23.1985 7.27888 23.4233 7.28702 23.5937 7.40728C23.7641 7.52754 23.8471 7.73707 23.8056 7.94136L21.3156 20.1443C21.2652 20.3887 21.0501 20.5644 20.8007 20.5644Z" fill="#ffcc00"></path>
				</g>
			</g>
		</g>
	</svg> ';
	$tab_details        = TabDetails::instance();
	$current_page       = MoUtility::get_current_page_parameter_value( 'page', '' );
	$request_uri        = admin_url( 'admin.php' );
	if ( ! empty( $current_page ) ) {
		$request_uri = add_query_arg( array( 'page' => $current_page ), $request_uri );
	}
	if ( in_array( $current_form, $premium_forms, true ) ) {
		++$count;
		$url = add_query_arg(
			array(
				'page'      => $tab_details->tab_details[ Tabs::FORMS ]->menu_slug,
				'form_name' => $current_form,
				'form'      => 'PREMIUMFORMS',
			),
			$request_uri
		);
		echo '<div class="search_box">';
		echo '<a class="mo_search"';
		echo 'href="' . esc_url( $url ) . '" data-value="' . esc_attr( $current_form['name'] ) . '" >';
		echo '<span class=" ">';
		echo esc_attr( $count ) . '.&nbsp';
		echo ' ' . esc_attr( $current_form['name'] ) . '&nbsp&nbsp<span class="tooltip">' . wp_kses( $premium_form_image, MoUtility::mo_allow_svg_array() ) . '
	<span class="tooltiptext prem_form_tooltip" >
	<span  class="header prem_form_header" ><b>' . esc_html( $current_form['plan_name'] ) . ' ' . esc_html__( 'Feature', 'miniorange-otp-verification' ) . '</b></span>
	<span class="body">' . esc_html__( 'Check the Licencing plans to upgrade to Premium plan to unlock this feature.', 'miniorange-otp-verification' ) . '</span>
	</span></span>';
		echo '</span></a></div>';
	} elseif ( $current_form->get_form_key() !== null ) {
			$class_name = get_mo_class( $current_form );
			$class_name = $current_form->is_form_enabled() ? 'configured_forms#' . $class_name : $class_name . '#' . $class_name;
			$url        = add_query_arg(
				array(
					'page' => $tab_details->tab_details[ Tabs::FORMS ]->menu_slug,
					'form' => $class_name,
				),
				$request_uri
			);
			++$count;
			echo '<div class="search_box">';
			echo '<a class="mo_search"';
			echo ' href="' . esc_url( $url ) . '" ';
			echo ' data-value="' . esc_attr( $current_form->get_form_name() ) . '" data-form="' . esc_attr( $class_name ) . '">';
			echo ' <span class="';
			echo $current_form->is_form_enabled() ? 'enabled">' : '">';
			echo esc_attr( $count ) . '.&nbsp';
			echo $current_form->is_form_enabled() ? '(  ENABLED  )' : '';
			echo wp_kses(
				$current_form->get_form_name(),
				array(
					'b'    => array(),
					'span' => array(
						'style' => array(),
					),
				)
			) . '</span></a></div>';
	}
	return $count;
}

/**
 * Display a dropdown with country and it's respective country code.
 */
function get_country_code_dropdown() {
	echo '<select name="default_country_code" id="mo_country_code" class="w-full">';
	echo '<option value="" disabled selected="selected">
            ----- ' . esc_html__( 'Select your Country', 'miniorange-otp-verification' ) . ' -----
          </option>';
	foreach ( CountryList::get_countrycode_list() as $key => $country ) {
		echo '<option data-countrycode="' . esc_attr( $country['countryCode'] ) . ' " value="' . esc_attr( $key ) . ' "';
		echo CountryList::is_country_selected( esc_attr( $country['countryCode'] ), esc_attr( $country['alphacode'] ) ) ? 'selected' : '';
		echo '>' . esc_attr( $country['name'] ) . '</option>';
	}
	echo '</select>';
}


/**
 * Display a multiselect dropdown to select countries to show in the
 * dropdown.
 *
 * @todo : This is for a future plugin update which allows user to select list of countries to be shown in the dropdown
 */
function get_country_code_multiple_dropdown() {
	echo '<select multiple size="5" name="allow_countries[]" id="mo_country_code">';
	echo '<option value="" disabled selected="selected">
            --------- ' . esc_html__( 'Select your Countries', 'miniorange-otp-verification' ) . ' -------
          </option>';

	echo '</select>';
}


/**
 * Loop through and show only configured form list.
 *
 * @param string $controller Controller base path.
 * @param string $disabled   Disabled attribute to be passed down to form views.
 */
function show_configured_form_details( $controller, $disabled ) {

	$form_handler      = FormList::instance();
	$mo_is_active_form = false;
	foreach ( $form_handler->get_list() as $form ) {
		if ( $form->is_form_enabled() && ! $form->is_add_on_form() ) {
			$namespace_class = get_class( $form );
			$class_name      = substr( $namespace_class, strrpos( $namespace_class, '\\' ) + 1 );
			if ( 'MoWCCheckoutNew' === $class_name ) {
				$class_name = 'WooCommerceCheckOutForm';
			}
			echo '<div class="flex flex-col gap-mo-2">
					<div class="flex">';
			// Validate file path before including to prevent directory traversal.
			$file_path = $controller . 'forms/class-' . strtolower( $class_name ) . '.php';
			if ( MoUtility::mo_require_file( $file_path, $controller . 'forms/' ) ) {
				include $file_path;
			}
			echo '	</div>
				</div>';
			$mo_is_active_form = true;
		}
	}
	if ( ! $mo_is_active_form ) {
		$tab_details     = TabDetails::instance();
		$forms_list_page = add_query_arg(
			'page',
			$tab_details->tab_details[ Tabs::FORMS ]->menu_slug . '#form_search',
			remove_query_arg( array( 'form' ) )
		);
		echo '<div class="w-full">
				<div class="w-full flex gap-mo-32 p-mo-4">
					<div class="mo_otp_note">
					<p class="flex-1 pr-mo-44 my-mo-1">
							' . esc_html__( 'You have not configured any form yet! Setup OTP Verification on your form by clicking here', 'miniorange-otp-verification' ) . '
						:<b><a href="' . esc_url( $forms_list_page ) . '">
						' . esc_html__( 'Show Form List', 'miniorange-otp-verification' ) . '
						</b></a>
						</p>
					</div>
				</div>
			</div>';
	}
}


/**
 * This function is used to show a multi-select dropdown of WooCommerce
 * Checkout Page.
 *
 * @param string $disabled  -disabled attributes.
 * @param array  $checkout_payment_plans -checkout payment plans.
 */
function get_wc_payment_dropdown( $disabled, $checkout_payment_plans ) {
	if ( ! function_exists( 'is_plugin_active' ) ) {
		include_once ABSPATH . 'wp-admin/includes/plugin.php';
	}
	if ( ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
		echo esc_html__( '[ Please activate the WooCommerce Plugin ]', 'miniorange-otp-verification' );
		return;
	}
	$payment_plans = WC()->payment_gateways->payment_gateways();
	echo '<select multiple size="5" name="wc_payment[]" id="wc_payment">';
	echo '<option value="" disabled>' . esc_html__( 'Select your Payment Methods', 'miniorange-otp-verification' ) . '</option>';
	foreach ( $payment_plans as $payment_plan ) {
		echo '<option ';
		if ( $checkout_payment_plans && array_key_exists( $payment_plan->id, $checkout_payment_plans ) ) {
			echo 'selected';
		} elseif ( ! $checkout_payment_plans ) {
			echo 'selected';
		}
		echo ' value="' . esc_attr( $payment_plan->id ) . ' ">' . esc_html( $payment_plan->title ) . '</option>';
	}
	echo '</select>';
}

/**
 * Shows the modal box for alerting user on low transaction
 *
 * @param string $remaining_sms Remaining SMS transaction number.
 * @param string $remaining_email Remaining Email transaction number.
 * @param string $transaction_key On which transaction breakpoint popup shown.
 * @param string $license_plan current lisence plan.
 * @return void
 */
function show_low_transaction_alert( $remaining_sms, $remaining_email, $transaction_key, $license_plan ) {

	echo ' <div id="mo_notice_modal" name="' . esc_attr( $transaction_key ) . '">
             <div class="mo_customer_validation-modal-backdrop "></div>';
			wp_nonce_field( 'mo_admin_actions' );

			echo '  <div id="popup-modal" class="mo-popup-modal">
                 <div class="mo-popup-modal-wrapper">
                    <div class="mo-popup-header-wrapper" style="border-bottom: 1px groove ;">
                        <div class="mo-popup-icon-wrapper">
                            <svg class="h-mo-7 w-mo-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>

                        <div class="mo-popup-text-wrapper">
                            ' . esc_html__( 'LOW ON TRANSACTIONS', 'miniorange-otp-verification' ) . '
                        </div>

                        <button type="button" id="mo_close_notice_button" class="mo-popup-close-button" data-modal-hide="staticModal">
                            <svg class="w-mo-6 h-mo-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>

                <div class="px-mo-5 ">';
	if ( 0 === (int) $remaining_sms && 'DEMO' === (string) $license_plan ) {
			echo '<div class="py-mo-2 rounded-lg">
					<div class="p-mo-4 text-xs font-semibold rounded-lg bg-blue-50" role="alert">
						' . esc_html( MoMessages::showMessage( MoMessages::ZERO_TRANSACTION_ALERT ) ) . '
						<div class="mo-popup-error-wrapper" role="alert">
							<i>"' . esc_html( MoMessages::showMessage( MoMessages::LOW_TRANSACTION_ERROR ) ) . '"</i>
						</div>
					</div>
					<div class="p-mo-4 my-mo-4 text-xs font-semibold rounded-lg mo-alert-error" role="alert">
						Contact us at <a style="cursor:pointer;" onClick="otpSupportOnClick(\'Hi! Could you please provide me with the 10 free SMS Transactions for testing purposes? \');"><u> otpsupport@xecurify.com</u></a> to avail one-time 10 free SMS transactions for testing purposes.
					</div>';
	} else {
			echo '<div class="py-mo-2 rounded-lg">
					<div class="p-mo-4 text-xs font-semibold rounded-lg bg-blue-50" role="alert">
						' . esc_html( MoMessages::showMessage( MoMessages::LOW_TRANSACTION_ALERT ) ) . '
					<div class="mo-popup-error-wrapper" role="alert">
						<i>"' . esc_html( MoMessages::showMessage( MoMessages::LOW_TRANSACTION_ERROR ) ) . '"</i>
					</div>
				</div>';
	}
			echo '  </div>

        			   <div class=" mo-popup-info-wrapper" style="border: 1px groove">
        			       <div class=" mo-popup-sms-wrapper">
						   ' . esc_html__( 'SMS REMAINING', 'miniorange-otp-verification' ) . '
        			       </div>
                               <div class="mo-popup-sms-count">
					   		' . esc_attr( $remaining_sms ) . '
        			   	    </div>
                       </div>

                        <div class=" mo-popup-email-info-wrapper" style="border: 1px groove">
                            <div class="mo-popup-email-wrapper">
							' . esc_html__( 'EMAIL REMAINING', 'miniorange-otp-verification' ) . '
                            </div>
                            <div class="mo-popup-email-count">
							' . esc_attr( $remaining_email ) . ' </div>
                            </div>
                        </div>

                    <div class="mo-popup-footer-wrapper"  style="border-top: 1px groove ;">
                        ';
						$recharge_url = add_query_arg(
							'requestOrigin',
							'wp_otp_verification_basic_plan',
							trailingslashit( MOV_PORTAL ) . 'initializePayment'
						);
						echo '<a target="_blank" rel="noopener noreferrer" href="' . esc_url( $recharge_url ) . '" class="w-full mo-button primary mx-mo-1">' . esc_html__( 'Check Pricing & Recharge', 'miniorange-otp-verification' ) . '</a>';
			echo '
                    </div>
                </div>
            </div>
        </div>';
}

/**
 * Shows the modal box to promote Country restriction addon
 *
 * @param string $addon_url URL to the Country restriction addon settings page.
 * @return void
 */
function show_selected_country_addon_alert( $addon_url ) {

	echo ' <div id="mo_selected_country_modal">
			 <div class="mo_customer_validation-modal-backdrop "></div>';
			wp_nonce_field( 'mo_admin_actions' );

			echo '  <div id="popup-modal" class="mo-popup-modal">
				 <div class="mo-popup-modal-wrapper">
					<div class="mo-popup-header-wrapper" style="border-bottom: 1px groove ;">
						<div class="mo-popup-icon-wrapper">
							<svg class="h-mo-7 w-mo-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008zM12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z" />
							</svg>
						</div>

						<div class="mo-popup-text-wrapper">
							' . esc_html__( 'Enable Country Restriction Addon', 'miniorange-otp-verification' ) . '
						</div>

						<button type="button" id="mo_close_selected_country_cross" class="mo-popup-close-button" data-modal-hide="staticModal">
							<svg class="w-mo-6 h-mo-6" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
							</svg>
						</button>
					</div>

					<div class="px-mo-5 ">
						<div class="py-mo-2 rounded-lg">
							<div class="p-mo-4 text-sm font-semibold rounded-lg bg-blue-50" role="alert">
							' . wp_kses( __( 'Enable <b>Country Restriction Addon</b> to allow OTPs only from selected countries. All other countries will be blocked for better security.', 'miniorange-otp-verification' ), MoUtility::mo_allow_html_array() ) . '
							</div>
						</div>
					</div>

					<div class="mo-popup-footer-wrapper" style="border-top: 1px groove ; display:flex; gap: 8px; justify-content: space-between; align-items: center;">
						<a href="' . esc_url( $addon_url ) . '" class="w-full mo-button primary mx-mo-1" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Enable Addon', 'miniorange-otp-verification' ) . '</a>
						<button type="button" id="mo_remind_later_selected_country_button" class="w-full mo-button secondary mx-mo-1">' . esc_html__( 'Remind me later', 'miniorange-otp-verification' ) . '</button>
					</div>
				 </div>
			  </div>
		 </div>';
}

/**
 * This function is called to generate the form details fields for a form.
 *
 * @param array  $form_details the details posted by the user.
 * @param string $show_verify_field show verify fields.
 * @param string $show_email_and_phone_field show email and phone field.
 * @param string $disabled disabled attribute.
 * @param string $key the name attribute of the hidden field.
 * @param string $form_name the name of the form.
 * @param string $key_type the type of the key.
 * @return mixed
 */
function get_multiple_form_select( $form_details, $show_verify_field, $show_email_and_phone_field, $disabled, $key, $form_name, $key_type ) {

	$row_template = "	<div id='row{FORM}{KEY}_{INDEX}' class='flex gap-mo-2'>
							<div class='mo-forms-input-wrapper'>
								<label class='mo-input-label'>" . esc_html__( 'Form ID', 'miniorange-otp-verification' ) . "</label>
								<input class=' mo-form-input' id='{FORM}_form_{KEY}_{INDEX}' value='{FORM_ID_VAL}' type='text' name='{FORM}_form[form][]' >
							</div>
									{EMAIL_AND_PHONE_FIELD}
									{VERIFY_FIELD}
									{REMOVE_BTN}
						</div>";

	$email_and_phone_field = " <span {HIDDEN1}>
									<div class='mo-forms-input-wrapper'>
										<label class='mo-input-label'>" . sprintf(
											/* translators: %s: email field type */
		esc_html__( 'Email Field %s', 'miniorange-otp-verification' ),
		esc_html( $key_type )
	) . "</label>
										<input class=' mo-form-input' id='{FORM}_form_email_{KEY}_{INDEX}' value='{EMAIL_KEY_VAL}' type='text' name='{FORM}_form[emailkey][]' >
									</div>
                                </span>
                                <span {HIDDEN2}>
									<div class='mo-forms-input-wrapper'>
										<label class='mo-input-label'>" . sprintf(
											/* translators: %s: phone field type */
		esc_html__( 'Phone Field %s', 'miniorange-otp-verification' ),
		esc_html( $key_type )
	) . "</label>
										<input class=' mo-form-input' id='{FORM}_form_phone_{KEY}_{INDEX}' value='{PHONE_KEY_VAL}' type='text' name='{FORM}_form[phonekey][]' >
									</div>
                                </span>";

	$verify_field = "	<span>
							<div class='mo-forms-input-wrapper'>
								<label class='mo-input-label'>" . sprintf(
									/* translators: %s: verification field type (e.g., Email, Phone) */
		esc_html__( 'Verification Field %s', 'miniorange-otp-verification' ),
		esc_html( $key_type )
	) . "</label>
								<input class=' mo-form-input' id='{FORM}_form_verify_{KEY}_{INDEX}' value='{VERIFY_KEY_VAL}' type='text' name='{FORM}_form[verifyKey][]' >
							</div>
                        </span>";

	$remove_btn_template = "<button type='button' class='mo-form-button secondary mo-remove-btn' onclick='removeSpecific_{FORM}(this);'>-</button>";

	$verify_field = $show_verify_field ? $verify_field : '';

	$email_and_phone_field = $show_email_and_phone_field ? $email_and_phone_field : '';

	$row_template = MoUtility::replace_string(
		array(
			'VERIFY_FIELD'          => $verify_field,
			'EMAIL_AND_PHONE_FIELD' => $email_and_phone_field,
		),
		$row_template
	);

	$counter = 0;
	if ( MoUtility::is_blank( $form_details ) ) {
		$details = array(
			'KEY'            => $key,
			'INDEX'          => 0,
			'FORM'           => $form_name,
			'HIDDEN1'        => 2 === $key ? 'hidden' : '',
			'HIDDEN2'        => 1 === $key ? 'hidden' : '',
			'FORM_ID_VAL'    => '',
			'EMAIL_KEY_VAL'  => '',
			'PHONE_KEY_VAL'  => '',
			'VERIFY_KEY_VAL' => '',
			'REMOVE_BTN'     => '',
		);
		echo wp_kses(
			MoUtility::replace_string( $details, $row_template ),
			array(
				'div'    => array(
					'id'    => array(),
					'class' => array(),
				),
				'label'  => array( 'class' => array() ),
				'input'  => array(
					'id'    => array(),
					'class' => array(),
					'name'  => array(),
					'type'  => array(),
					'value' => array(),
				),
				'span'   => array(
					'hidden' => array(),
				),
				'button' => array(
					'type'    => array(),
					'class'   => array(),
					'onclick' => array(),
				),
			)
		);
	} else {
		$total_rows = count( $form_details );
		foreach ( $form_details as $form_key => $form_detail ) {
			$remove_button = $total_rows > 1
			? str_replace(
				array( '{FORM}', '{KEY}', '{INDEX}' ),
				array( $form_name, $key, $counter ),
				$remove_btn_template
			)
			: '';
			$details       = array(
				'KEY'            => $key,
				'INDEX'          => $counter,
				'FORM'           => $form_name,
				'HIDDEN1'        => 2 === $key ? 'hidden' : '',
				'HIDDEN2'        => 1 === $key ? 'hidden' : '',
				'FORM_ID_VAL'    => $show_email_and_phone_field ? $form_key : $form_detail,
				'EMAIL_KEY_VAL'  => $show_email_and_phone_field ? $form_detail['email_show'] : '',
				'PHONE_KEY_VAL'  => $show_email_and_phone_field ? $form_detail['phone_show'] : '',
				'VERIFY_KEY_VAL' => $show_verify_field ? $form_detail['verify_show'] : '',
				'REMOVE_BTN'     => $remove_button,
			);
			echo wp_kses(
				MoUtility::replace_string( $details, $row_template ),
				array(
					'div'    => array(
						'id'    => array(),
						'class' => array(),
					),
					'label'  => array( 'class' => array() ),
					'input'  => array(
						'id'    => array(),
						'class' => array(),
						'name'  => array(),
						'type'  => array(),
						'value' => array(),
					),
					'span'   => array(
						'hidden' => array(),
					),
					'button' => array(
						'type'    => array(),
						'class'   => array(),
						'onclick' => array(),
					),
				)
			);
			++$counter;
		}
	}
	$result['counter'] = $counter;
	return $result;
}

/**
 * This function is used to generate the scripts necessary to add or remove
 * fields for taking form details from the admin.
 *
 * @param string $show_verify_field show verify fields.
 * @param string $show_email_and_phone_field show email and phone field.
 * @param string $form_name the name of the form.
 * @param string $key_type the type of the key.
 * @param string $counters the counters.
 */
function multiple_from_select_script_generator( $show_verify_field, $show_email_and_phone_field, $form_name, $key_type, $counters ) {
	$row_template = "	<div id='row{FORM}{KEY}_{INDEX}' class='flex gap-mo-2'>
							<div class='mo-forms-input-wrapper'>
								<label class='mo-input-label'>" . esc_html__( 'Form ID', 'miniorange-otp-verification' ) . "</label>
								<input class=' mo-form-input' id='{FORM}_form_{KEY}_{INDEX}' value='' type='text' name='{FORM}_form[form][]' >
							</div>
									{EMAIL_AND_PHONE_FIELD}
									{VERIFY_FIELD}
						</div>";

	$email_and_phone_field = " <span class='{HIDDEN1}'>
									<div class='mo-forms-input-wrapper'>
										<label class='mo-input-label'>" . sprintf(
											/* translators: %s: email field type */
		esc_html__( 'Email Field %s', 'miniorange-otp-verification' ),
		esc_html( $key_type )
	) . "</label>
										<input class=' mo-form-input' id='{FORM}_form_email_{KEY}_{INDEX}' value='' type='text' name='{FORM}_form[emailkey][]' >
									</div>
                                </span>
                                <span class='{HIDDEN2}'>
									<div class='mo-forms-input-wrapper'>
										<label class='mo-input-label'>" . sprintf(
											/* translators: %s: phone field type */
		esc_html__( 'Phone Field %s', 'miniorange-otp-verification' ),
		esc_html( $key_type )
	) . "</label>
										<input class=' mo-form-input' id='{FORM}_form_phone_{KEY}_{INDEX}' value='' type='text' name='{FORM}_form[phonekey][]' >
									</div>
                                </span>";

	$verify_field = "	<span>
							<div class='mo-forms-input-wrapper'>
								<label class='mo-input-label'>" . sprintf(
									/* translators: %s: verification field type (e.g., Email, Phone) */
		esc_html__( 'Verification Field %s', 'miniorange-otp-verification' ),
		esc_html( $key_type )
	) . "</label>
								<input class=' mo-form-input' id='{FORM}_form_verify_{KEY}_{INDEX}' value='' type='text' name='{FORM}_form[verifyKey][]' >
							</div>
                        </span>";

	$verify_field          = $show_verify_field ? $verify_field : '';
	$email_and_phone_field = $show_email_and_phone_field ? $email_and_phone_field : '';

	$row_template = MoUtility::replace_string(
		array(
			'VERIFY_FIELD'          => $verify_field,
			'EMAIL_AND_PHONE_FIELD' => $email_and_phone_field,
		),
		$row_template
	);

	$row_template = trim( preg_replace( '/\s\s+/', ' ', $row_template ) );
	$row_template = MoUtility::replace_string( array( 'FORM' => $form_name ), $row_template );

	$remove_row = "<button type='button' class='mo-form-button secondary mo-remove-btn' onclick='removeSpecific_{FORM}(this);'>-</button></div>";
	$remove_row = MoUtility::replace_string( array( 'FORM' => $form_name ), $remove_row );

	// Register and enqueue the script if not already done.
	$script_handle = 'mo-multiple-form-select';
	if ( ! wp_script_is( $script_handle, 'registered' ) ) {
		wp_register_script(
			$script_handle,
			MOV_URL . 'includes/js/mo-multiple-form-select.js',
			array( 'jquery' ),
			MOV_VERSION,
			true
		);
	}

	// Use a global variable to accumulate form configurations across all calls.
	global $mo_multiple_form_select_data;
	if ( ! isset( $mo_multiple_form_select_data ) ) {
		$mo_multiple_form_select_data = array();
	}

	// Store form configuration.
	$mo_multiple_form_select_data[ $form_name ] = array(
		'counters'          => array(
			(int) $counters[0],
			(int) $counters[1],
			(int) $counters[2],
		),
		'rowTemplate'       => $row_template,
		'removeRowTemplate' => $remove_row,
	);

	// Enqueue script.
	wp_enqueue_script( $script_handle );

	if ( ! has_action( 'admin_footer', 'mo_localize_multiple_form_select_script' ) ) {
		add_action( 'admin_footer', 'mo_localize_multiple_form_select_script', 999 );
	}
}

/**
 * Localize script with all accumulated form data.
 * This function is called once in admin_footer to ensure all form data is included.
 */
function mo_localize_multiple_form_select_script() {
	global $mo_multiple_form_select_data;
	$script_handle = 'mo-multiple-form-select';

	if ( ! empty( $mo_multiple_form_select_data ) && wp_script_is( $script_handle, 'enqueued' ) ) {
		wp_localize_script(
			$script_handle,
			'moMultipleFormSelect',
			array(
				'forms' => $mo_multiple_form_select_data,
			)
		);
	}
}

/**
 * Shows the modal box to promote Transaction Logs feature
 *
 * @param string $reporting_url URL to the Transaction Report settings page.
 * @return void
 */
function show_transaction_logs_alert( $reporting_url ) {

	echo ' <div id="mo_transaction_logs_modal">
			 <div class="mo_customer_validation-modal-backdrop "></div>';
			wp_nonce_field( 'mo_admin_actions' );

			echo '  <div id="popup-modal" class="mo-popup-modal">
				 <div class="mo-popup-modal-wrapper">
					<div class="mo-popup-header-wrapper" style="border-bottom: 1px groove ; background-color: #f0fdf4;">
						<div class="mo-popup-icon-wrapper">
							<svg class="h-mo-7 w-mo-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
							</svg>
						</div>

						<div class="mo-popup-text-wrapper" style="color: #16a34a;">
							' . esc_html__( 'Enable Transaction Logs', 'miniorange-otp-verification' ) . '
						</div>

						<button type="button" id="mo_close_transaction_logs_cross" class="mo-popup-close-button" data-modal-hide="staticModal">
							<svg class="w-mo-6 h-mo-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
							</svg>
						</button>
					</div>

					<div class="px-mo-5 ">
						<div class="py-mo-2 rounded-lg">
							<div class="p-mo-4 text-sm font-semibold rounded-lg bg-green-50" role="alert">
							' . wp_kses( __( 'Enable <b>Transaction Logs</b> to track and monitor all OTP verification as well as notifications activities.', 'miniorange-otp-verification' ), MoUtility::mo_allow_html_array() ) . '
							</div>
						</div>
					</div>

					<div class="mo-popup-footer-wrapper" style="border-top: 1px groove ; display:flex; gap: 8px; justify-content: space-between; align-items: center;">
						<a href="' . esc_url( $reporting_url ) . '" target="_blank" rel="noopener noreferrer" class="w-full mo-button primary mx-mo-1">' . esc_html__( 'Enable Transaction Logs', 'miniorange-otp-verification' ) . '</a>
						<button type="button" id="mo_remind_later_transaction_logs_button" class="w-full mo-button secondary mx-mo-1">' . esc_html__( 'Remind me later', 'miniorange-otp-verification' ) . '</button>
					</div>
				 </div>
			  </div>
		 </div>';
}

/**
 * Shows AddonList
 * Mostly used on the Views Section of the plugin
 */
function show_addon_list() {
	$gateway = GatewayFunctions::instance();
	$gateway->show_addon_list();
}
