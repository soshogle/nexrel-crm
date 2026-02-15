<?php


namespace rednaowooextraproduct\ajax;


use rednaowooextraproduct\core\Managers\EmailManager\EmailManager;
use rednaowooextraproduct\core\Managers\EmailManager\TestEmailManager;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;
use rednaowooextraproduct\core\Managers\FormManager\Test\FakeEntry;
use rednaowooextraproduct\core\Managers\FormManager\Test\FakePrice;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\SlateGenerator;
use rednaowooextraproduct\pr\Utilities\Activator;
use rednaowooextraproduct\repository\ProductRepository;

class ProductDesignerAjax extends AjaxBase
{

    public function __construct($core, $prefix)
    {
        parent::__construct($core, $prefix, 'product_designer');
    }


    protected function RegisterHooks()
    {
        $this->RegisterPrivate('load_variations','LoadVariations');
        $this->RegisterPrivate('send_test_email','SendTestEmail');

        $this->RegisterPrivate('activate_license','ActivateLicense');
        $this->RegisterPrivate('deactivate_license','DeactivateLicense');

    }



    public function ActivateLicense(){

        $licenseKey=$this->GetRequired('LicenseKey');
        $expirationDate=$this->GetRequired('ExpirationDate');
        $url=$this->GetRequired('URL');
        (new Activator())->SaveLicense($this->Loader,$licenseKey,$expirationDate,$url);
        $this->SendSuccessMessage('');
    }

    public function DeactivateLicense(){
        Activator::DeleteLicense($this->Loader);

        $this->SendSuccessMessage('');
    }

    public function LoadVariations(){
        $productId=$this->GetRequired('ProductId');
        $productNonce=$this->GetRequired('ProductNonce');

        if(!\wp_verify_nonce($productNonce,$productId.'_product_designer'))
            $this->SendErrorMessage('Invalid request');

        $this->SendSuccessMessage((new ProductRepository())->GetVariations($productId));

    }

    public function SendTestEmail(){
        $model=$this->GetRequired('Model');
        $email=$this->GetRequired('Email');

        $formBuilder=new FormBuilder($this->Loader,$model,new FakeEntry($model),new FakePrice());
        $formBuilder->Initialize();

         $emailManager=new TestEmailManager();
         $emailManager->Initialize($formBuilder,$email);
         if($emailManager->Send())
         {
            $this->SendSuccessMessage('Email sent successfully');
         }else{
             $error='An error occurred while trying to send the email.';
             if($emailManager->Error!='')
             {
                 $error.=' Additional detail:'.$emailManager->Error;
             }
             $this->SendErrorMessage($error);
         }


    }
}