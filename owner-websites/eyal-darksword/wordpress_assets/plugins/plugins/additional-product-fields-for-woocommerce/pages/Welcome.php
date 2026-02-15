<?php
use rednaowooextraproduct\core\Loader;
global $rninstance;
/** @var Loader $instance */
$instance=$rninstance;
?>

<style>
    body{
        background-color: white;
    }
</style>
<div style="display: flex;align-items: center;justify-content: center;">
    <img src="<?php echo $instance->URL ?>images/welcome/logo.png"/>
    <h1 style="text-align: center">Thank your for installing Product Field Builder for WooCommerce</h1>
</div>
<div style="display: flex;flex-direction: row;justify-content: center;">
    <div>
        <h1 style="margin-top: 50px;">How it works</h1>
        <div>
            <strong style="font-size: 18px">1. Open a product and click on 'Advanced Product Options'</strong>
            <img style="display: block;margin: 10px;" src="<?php echo $instance->URL ?>images/welcome/screenshot1.png">
        </div>
        <div>
            <strong style="font-size: 18px">2. Configure the fields that you want to use</strong>
            <img style="display: block;margin: 10px;" src="<?php echo $instance->URL ?>images/welcome/screenshot2.png">
        </div>

        <div>
            <strong style="font-size: 18px">3. That's it! Enjoy Product Field Builder for WooCommerce</strong>
        </div>
    </div>
    <div>
        <h1 style="margin-top: 50px;">Have any question or problem?</h1>
        <ul style="font-size: 18px;list-style-type: circle;font-weight: 600;">
            <li>You can check the <a target="_blank" href="http://productbuilder.rednao.com//documentation/">Documentation</a> </li>
            <li style="margin-top: 20px;">Or if you need support or has a suggestion don't hesitate to contact us in the <a target="_blank" href="https://wordpress.org/support/plugin/additional-product-fields-for-woocommerce/">Support Portal</a> </li>
        </ul>
    </div>
</div>