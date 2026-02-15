<?php
/**
 * Created by PhpStorm.
 * User: Edgar
 * Date: 2/25/2019
 * Time: 8:57 AM
 */

namespace rednaowooextraproduct\core;





use rednaoformpdfbuilder\ajax\DesignerAjax;
use rednaoformpdfbuilder\ajax\TemplateListAjax;
use rednaoformpdfbuilder\Integration\Processors\Entry\Retriever\EntryRetrieverBase;
use rednaoformpdfbuilder\Integration\Processors\Loader\ProcessorLoaderBase;

use rednaowooextraproduct\ajax\OrderDesignerAjax;
use rednaowooextraproduct\ajax\ProductDesignerAjax;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBTextField;
use rednaowooextraproduct\core\Managers\WooStagesManager;
use rednaowooextraproduct\core\Utils\ArrayUtils;
use rednaowooextraproduct\Integration\PluginsIntegration\PluginIntegrationManager;
use rednaowooextraproduct\Integration\Translations\TranslatorFactory;
use rednaowooextraproduct\Integration\Widgets\ElementorWidget;
use rednaowooextraproduct\pages\GlobalPromo;
use rednaowooextraproduct\panel\ProductBuilderPanel;
use rednaowooextraproduct\pr\Integration\Translations\ProductTranslations;
use rednaowooextraproduct\pr\PRLoader;
use rednaowooextraproduct\repository\ProductRepository;
use undefined\DTO\FormBuilderOptions;


class Loader extends PluginBase
{
    /** @var PRLoader */
    public $PRLoader=null;
    public $RECORDS_TABLE;
    public $TEMPLATES_TABLE;
    public $FormConfigTable;
    public $GlobalTable;
    public $TranslationTable;


    public function __construct($filePath,$prefix,$rootPath,$config)
    {
        parent::__construct($filePath,$prefix,109,95,$rootPath,$config);
        global $wpdb;
        $this->GlobalTable=$wpdb->prefix.$prefix.'_global_table';
        $this->TranslationTable=$wpdb->prefix.$prefix.'_translations';
        add_action( 'init', function () {
            load_plugin_textdomain('rednaowooextraproduct', false, dirname(plugin_basename(dirname(__FILE__))) . '/languages/');
        });
        \add_filter('woo_extra_products_get_loader',array($this,'GetLoader'));

        new WooStagesManager($this);
        new ProductDesignerAjax($this,$prefix);
        new OrderDesignerAjax($this,$prefix);
        require_once $this->DIR.'Integration/RNEPO.php';
        \add_action( 'admin_menu', array( $this, 'AddMenuFr' ), 1000 );
        add_action('admin_notices', array($this,'ShowNotice'));
        //add_action( 'elementor/widgets/register', array($this,'RegisterElementorWidget') );

        if($this->IsPR())
        {
            new PRLoader($this);
        }

    }

    public function RegisterElementorWidget($widgetManager){
        $widgetManager->register( new ElementorWidget() );
    }

    public function ShowNotice(){
        if(isset($_GET['DismissAllInOneNotice'])&&intval($_GET['DismissAllInOneNotice'])==1)
        {
            update_option('AllInOneNoticeTime',-1);
            return;
        }

        if(get_option('DismissAllInOneNotice',false)===true)
        {
            return;
        }


        $time=get_option('AllInOneNoticeTime',false);
        if($time==-1)
            return;

        if($time===false) {
            update_option('AllInOneNoticeTime', strtotime("now"));
            return;
        }

        $past_date = strtotime( '-14 days' );
        if ( $past_date < $time ) {
            return;
        }



        echo '<div class="notice notice-info is-dismissible"  data-dismissible="notice-one-forever" >
                <div style="padding: 10px;display: flex;align-items: center;">
                    <a target="_blank" href="https://es-mx.wordpress.org/plugins/all-in-one-forms/" style="display: inline-flex;flex-direction: column;text-align: center;align-items: center">                 
                        <img src="'.esc_attr($this->URL).'images/allinonelogo.png" style="width: 100px;"/>   
                        <strong style="font-size: 20px;margin-top: 5px;">AIO Forms</strong>
                    </a>
                 
                    <div style="margin-left: 15px;">
                         <h2 style="margin: 0">Are you enjoing extra product options for WooCommerce? Try our form builder!</h2>
                         <ul style="list-style: circle;list-style-position: inside;margin-left: 10px;">
                            <li>Tons of fields and all of them are available in the free version!</li>
                            <li>Support for conditional logic, formulas, multiple step forms etc. (also available in the free version!)</li>
                            <li>Easy to use and intuitive </li>                      
                         </ul>
                    </div>              
                </div>
                    
                <div style="margin-bottom: 10px">
                    <a target="_blank" style="vertical-align: top;" href="https://wordpress.org/plugins/all-in-one-forms/" class="button-primary">Learn more</a>
                    <form style="display: inline-block;vertical-align: top;">
                        <input type="hidden" name="DismissAllInOneNotice" value="1"/>
                        <button class="button-secondary">'.__("Do not show this again","rednaowooextraproduct").'</button>
                    </form>
                </div>
                
         </div>';
    }

    public function GetLoader(){
        return $this;
    }

    public function AddMenuFr(){
        if(!$this->IsPR())
            add_submenu_page('woocommerce','Global product options','Global product options',
                'manage_woocommerce','woocommerce_extra_product_add_global_options',
                array($this,'AddGlobalOptionsFr'));
    }

    public function AddGlobalOptionsFr(){
        $promo=new GlobalPromo($this);
        $promo->Render();
    }

    public function IsPR(){

        return \file_exists($this->DIR.'pr');
    }



    public function OnPluginIsActivated()
    {
        set_transient( '_woo_extra_products_go_to_welcome', true, 30 );
    }


    public function CheckIfPDFAdmin(){
        if(!current_user_can('manage_options'))
        {
            die('Forbidden');
        }
    }


    public function OnCreateTable()
    {
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        $sql = "CREATE TABLE " . $this->GlobalTable . " (
                id INT AUTO_INCREMENT,
                options MEDIUMTEXT,
                conflict_style VARCHAR(200),
                include MEDIUMTEXT,
                exclude MEDIUMTEXT,
                name VARCHAR(200) NOT NULL,
                last_update DATETIME,
                disabled TINYINT,
                server_options MEDIUMTEXT,
                PRIMARY KEY  (id)
                ) COLLATE utf8_general_ci;";
        \dbDelta($sql);

        $sql="CREATE TABLE ".$this->TranslationTable." (
        translation_id int AUTO_INCREMENT,    
        id int not null,
        type TINYINT not null, 
        lang_code VARCHAR(10) NOT NULL,
        translations MEDIUMTEXT,
        PRIMARY KEY  (translation_id)
        ) COLLATE utf8_general_ci;";
        dbDelta($sql);
    }

    public function RegisterScripts(){
        global $post, $typenow, $current_screen;

        if($current_screen->post_type=='product')
        {
            $this->EnqueueProductBuilder();
        }
    }




    public function CreateHooks()
    {
        add_action('admin_footer',array($this,'AddDeactivationDialog'));
        add_action('admin_menu', array($this,'WelcomePageMenu'));
        add_action( 'admin_head', array($this,'RemoveWelcomePage' ));
        add_action( 'admin_init', array($this,'AdminInit') );
        add_action( 'admin_notices', array($this,'ReviewNotice') );
        add_action('admin_enqueue_scripts',array($this,'RegisterScripts'));
        add_filter( 'woocommerce_product_data_tabs', array( $this, 'AddProductTab' ) );
        add_action( 'woocommerce_product_data_panels', array( $this, 'AddProductPanel' ) );
        add_action( 'woocommerce_process_product_meta', array( $this, 'SaveProductMeta' ) );
        add_action( 'woocommerce_before_add_to_cart_button', array( $this, 'BeforeAddToCartButton' ) );
        add_action( 'woocommerce_after_shop_loop_item',  array( $this, 'BeforeAddToCartButtonLoop' ) , 10 );

        add_filter('woo-extra-product-get-additional-fields',array($this,'GetAllFields'),10,5);
        \add_filter('woo-extra-product-get-field-by-type',array($this,'GetPHPField'),10,6);

        new FreeCartItemPrinter($this);
    }

    public function ReviewNotice(){
        $review=new ReviewHelper($this);
        $review->Start();

    }

    public function GetAllFields($fields){
        $fields[]='FBMaskedField';
        $fields[]='FBColorPickerField';
        $fields[]='FBCheckBox';
        $fields[]='FBDatePicker';
        $fields[]='FBTextWithStyles';
        $fields[]='FBDivider';
        $fields[]='FBLinkButton';
        $fields[]='FBDropDown';
        $fields[]='FBMaskedField';
        $fields[]='FBParagraph';
        $fields[]='FBRadio';
        $fields[]='FBTextArea';
        $fields[]='FBTextField';
        $fields[]='FBNumber';
        $fields[]='FBSlider';
        $fields[]='FBButtonCounter';
        $fields[]='FBButtonSelection';
        $fields[]='FBSwitch';
        $fields[]='FBSignature';
        $fields[]='FBColorSwatcher';
        $fields[]='FBTermOfService';
        $fields[]='FBGoogleMaps';
        $fields[]='FBTextualImage';
        $fields[]='FBTotalField';

        return $fields;
    }

    public function GetPHPField($field,$loader,$fieldType,$column,$fieldOptions,$entry)
    {
        if($field!=null)
            return $field;
        switch ($fieldType)
        {
            case 'masked':
                return new FBTextField($loader,$column,$fieldOptions,$entry);
        }
    }

    public function WelcomePageMenu(){
        add_dashboard_page('Welcome', 'Welcome', 'read', 'woo-extra-product-welcome', array($this,'WelcomePage'));
    }

    public function RemoveWelcomePage(){
        remove_submenu_page( 'index.php', 'woo-extra-product-welcome' );
    }

    public function WelcomePage(){
        global $rninstance;
        $rninstance=$this;
        require_once $this->DIR.'pages/Welcome.php';
    }

    public function AdminInit(){

        if ( ! get_transient( '_woo_extra_products_go_to_welcome' ) ) {
            return;
        }

        // Delete the redirect transient
        delete_transient( '_woo_extra_products_go_to_welcome' );
        // Bail if activating from network, or bulk
        if ( is_network_admin() || isset( $_GET['activate-multi'] ) ) {
            return;
        }

        if ( \get_option( '_woo_extra_products_go_to_welcome') !='') {
            return;
        }

        // Delete the redirect transient
        \update_option( '_woo_extra_products_go_to_welcome' ,true);
        // Redirect to bbPress about page
        wp_safe_redirect( add_query_arg( array( 'page' => 'woo-extra-product-welcome' ), admin_url( 'index.php' ) ) );

    }

    public function BeforeAddToCartButtonLoop()
    {
        $addInProductLoop=false;
        if(!apply_filters('woo-extra-product-add-in-product-loop',$addInProductLoop))
            return;
        $this->BeforeAddToCartButton();
    }

    public function BeforeAddToCartButton(){
        $previousData=null;
        if(isset($_GET['cart_item'])&&isset($_GET['nonce']))
        {
            $nonce=strval($_GET['nonce']);
            $cartKey=strval($_GET['cart_item']);
            if(!\wp_verify_nonce($nonce,'edit_'.$cartKey))
                return;

            $cart_contents = WC()->cart->cart_contents;
            if(isset($cart_contents[$cartKey]))
            {
                $cartItem=$cart_contents[$cartKey];
                $previousData=array();
                if(isset($cartItem['rn_entry']))
                {
                    $previousData['Fields']=$cartItem['rn_entry']->Fields;
                }

                $previousData['CartKey']=$cartKey;
                $previousData['Quantity']=$cartItem['quantity'];
            }
        }



        $id=\uniqid();

        echo '<div class="RNAddToCartContainer" data-varid="'.$id.'"></div>';
        global $product;
        $repository=new ProductRepository();
        /** @var FormBuilderOptions $options */
        $options=\json_decode($repository->GetProductExtraOptions($product->get_id()));
        if($options==false)
            return;
        $translations=array('InternalShared');




        do_action('rndevtools_initializing_rendering','ExtraProductOptions','Form');


        global $productsToLoad;
        if($productsToLoad==null)
            $productsToLoad=array();

        $productsToLoad[]=$id;

        global $rnProdDependencies;
        if($rnProdDependencies==null)
            $rnProdDependencies=array();
        if(isset($options->ExtensionsUsed))
        {
            foreach($options->ExtensionsUsed as $extension)
            {
                $rnProdDependencies=\apply_filters('woo-extra-product-get-extension-runnable-'.$extension,$rnProdDependencies);
            }
        }

        if($this->IsPR())
        {
            $productTranslations=new ProductTranslations($this);
            $productTranslations->MaybeTranslateProduct($product->get_id(),$options,$translations);
        }


        $this->AddRNTranslator($translations);
        $this->AddScript('shared-core','js/dist/SharedCore_bundle.js',array('@RNTranslator','wp-element','regenerator-runtime'));
        $this->AddScript('internal-shared','js/dist/InternalShared_bundle.js',array('@shared-core'));
        $this->AddScript('form-builder','js/dist/FormBuilder_bundle.js',array('@RNTranslator','@internal-shared','jquery'));
        $this->AddStyle('form-builder','js/dist/FormBuilder_bundle.css');
        if(isset($options->MultipleSteps)&&$options->MultipleSteps!=null)
        {
            $this->AddScript('multiplesteps','js/dist/MultipleSteps_bundle.js', array('@form-builder'));
            $rnProdDependencies[]='@multiplesteps';
        }

        $fieldsWithTranslation=['FBRepeater'];
        $fieldsWidthStyle=['FBAppointment','FBPopUpSelector','FBGroupButton','FBColorPickerField','FBSizeChart','FBDropDown','FBDatePicker','FBPopup','FBTextWithStyles','FBCollapsible','FBDateRange','FBFile','FBGroupPanel','FBImagePicker','FBList','FBRepeater','FBSlider','FBRange','FBButtonSelection','FBSignature','FBColorSwatcher','FBTermOfService','FBSearchableSelect','FBLikertScale','FBSurvey','FBFontPicker'];
        if(isset($options->DynamicFieldTypes))
        {
            if(isset($options->Version))
            {
                foreach ($options->DynamicFieldTypes as $currentDynamicField)
                {
                    $result=apply_filters('woo-extra-product-load-field',['wasLoaded'=>false,'dependencies'=>$rnProdDependencies,'fieldName'=>$currentDynamicField,'form'=>$options]);
                    if($result['wasLoaded'])
                    {
                        $rnProdDependencies=$result['dependencies'];
                        continue;
                    }
                     $rnProdDependencies[] = '@' . $currentDynamicField;
                    $this->AddScript($currentDynamicField, 'js/dist/' . $currentDynamicField . '_bundle.js', array('@form-builder'));
                    if(\in_array($currentDynamicField,$fieldsWidthStyle))
                        $this->AddStyle($currentDynamicField, 'js/dist/' . $currentDynamicField . '_bundle.css');

                    if(\in_array($currentDynamicField,$fieldsWithTranslation))
                        $this->AddRNTranslator($currentDynamicField);
                }
            }else{
                $additionalFields=array();
                $additionalFields=\apply_filters('woo-extra-product-get-additional-fields',$additionalFields);
                $rnProdDependencies=array();
                foreach ($additionalFields as $field)
                {
                    $rnProdDependencies[]='@'.$field;
                    $this->AddScript($field,'js/dist/'.$field.'_bundle.js',array('@form-builder'));
                }
                $rnProdDependencies=apply_filters('woo-extra-product-fields-loaded',$rnProdDependencies);
            }


        }

        if(isset($options->AdditionalDependencies))
        {
            foreach($options->AdditionalDependencies as $dependency)
            {
                $this->AddScript($dependency,'js/dist/'.$dependency.'_bundle.js',array('@form-builder'));
                if($dependency=='ImagePreviewManager')
                    $this->AddStyle($dependency,'js/dist/'.$dependency.'_bundle.css');
                $rnProdDependencies[]='@'.$dependency;
            }
        }

        if($this->IsPR())
        {
            $rnProdDependencies[]='@FormulaParser';
            $rnProdDependencies[]='@FormBuilderPr';
            $this->AddScript('FormBuilderPr', 'js/dist/FormBuilderPr_bundle.js',array('@form-builder'));
            $this->AddScript('FormulaParser', 'js/dist/FormulaParser_bundle.js');
        }
        PluginIntegrationManager::Initialize($this->GetLoader());

        $this->RemoveScript('runnable-form-builder');
        $rnProdDependencies=apply_filters('woo-extra-product-load-extra-options',$rnProdDependencies,$product,$options);
        $this->AddScript('runnable-form-builder','js/dist/RunnableFormBuilder_bundle.js',\array_merge($rnProdDependencies, array('@form-builder')));

        $variations=$repository->GetVariations($product->get_id());
        $attributes=$repository->GetAttributes($product->get_id(),true,true);



        if($options!=null)
        {
            do_action('woo-extra-product-before-load-options',$options);

            /** Kept for compatibility reasons, do not use */
            do_action('woo-extra-product-load-fonts', $options);
        }


        if(isset($options->AdditionalDependencies))
        {
            foreach($options->AdditionalDependencies as $dependency)
            {
                if($dependency=='HasRoleFunction')
                {
                    $user = get_userdata(get_current_user_id());
                    $roles=[];

                    if ($user)
                    {
                        global $wp_roles;
                        foreach ($user->roles as $role)
                        {
                            $roleLabel = '';
                            if (isset($wp_roles->roles[$role]))
                            {
                                $roleLabel = $wp_roles->roles[$role]['name'];
                            }

                            $roles[$role] = $roleLabel;


                        }
                    }

                    $this->LocalizeScript('rnPBUserData','form-builder','',['Roles'=>$roles]);

                }
            }
        }


        $this->LocalizeScript('ProductBuilderOptions_'.$id,'form-builder','ProductBuilder',\apply_filters('woo-extra-product-load-vars',array(
           'Options'=>(array)$options,
           "URL"=>$this->URL,
           'IsVariable'=>$product->has_child(),
           'WCCurrency'=>array(
              'Format'=>get_woocommerce_price_format(),
              'Decimals'=>wc_get_price_decimals(),
              'ThousandSeparator'=>wc_get_price_thousand_separator(),
              'DecimalSeparator'=>wc_get_price_decimal_separator(),
              'Symbol'=>get_woocommerce_currency_symbol(),
            ),
            'Product'=>array(
                "Id"=>$product->get_id(),
                'Price'=>$product->get_price(),
                'SalePrice'=>$product->get_sale_price()

            ),
            'Variations'=>$variations,
            'Attributes'=>$attributes,
            'PreviousData'=>$previousData
        ),\apply_filters('woo-extra-product-get-post-id',$product->get_id()),$this));
    }

    public function SaveProductMeta(){
        if(isset($_POST['rednao_advanced_product_options'])&&\is_object(\json_decode(\stripslashes($_POST['rednao_advanced_product_options']))))
        {
            $options=json_decode(\stripslashes($_POST['rednao_advanced_product_options']));
            global $post_id;
            if(count($options->Rows)==0)
            {
                $repository=new ProductRepository();
                $repository->SaveProductExtraOptions($post_id,'','','');
            }else
            {
                $repository = new ProductRepository();
                $repository->SaveProductExtraOptions($post_id, $_POST['rednao_advanced_product_options'], $_POST['rednao_advanced_product_server_options'],$_POST['rednao_advanced_fees']);
            }

            if(isset($_POST['rednao_advanced_translations'])&&trim($_POST['rednao_advanced_translations'])!='')
            {
                $translations=json_decode(stripslashes($_POST['rednao_advanced_translations']));
                if(!is_array($translations))
                    return;
                $repository->SaveTranslations($post_id,ProductRepository::TRANSLATION_TYPE_PRODUCT,$translations);
            }
        }
    }


    public function AddProductTab($tabs){
        $tabs['rednao-advanced-products'] = array(
            'label'  => esc_html__( 'Advanced Product Options', 'rednaowooextraproduct' ),
            'target' => 'rednao-advanced-products',
            'class'  => array( 'rednao-advanced-products','hide_if_grouped')
        );

        return $tabs;
    }


    public function AddProductPanel(){
        $panel= new ProductBuilderPanel($this);
        $panel->Execute();
    }

    public function AddDeactivationDialog(){
        $pluginName = \plugin_basename($this->MainFilePath);
        echo '<script type="text/javascript">var rednaoAdminEmail="'.get_option('admin_email').'"</script>';
        $this->AddScript('Shared','js/dist/SharedCore_bundle.js',array('wp-element','regenerator-runtime'));
        $this->AddScript('DeactivationDialog','js/dist/DeactivationDialog_bundle.js',array('Shared'));

    }

    private function EnqueueProductBuilder()
    {
    }

}