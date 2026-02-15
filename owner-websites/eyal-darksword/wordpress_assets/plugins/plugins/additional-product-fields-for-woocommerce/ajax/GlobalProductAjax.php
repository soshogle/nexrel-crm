<?php


namespace rednaowooextraproduct\ajax;


use rednaowooextraproduct\core\Managers\EmailManager\EmailManager;
use rednaowooextraproduct\core\Managers\EmailManager\TestEmailManager;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;
use rednaowooextraproduct\core\Managers\FormManager\Test\FakeEntry;
use rednaowooextraproduct\core\Managers\FormManager\Test\FakePrice;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\SlateGenerator;
use rednaowooextraproduct\pr\Repositories\GlobalProductRepository;
use rednaowooextraproduct\pr\Utilities\Activator;
use rednaowooextraproduct\repository\ProductRepository;
use rednaowooextraproduct\Utilities\ObjectSanitizer;

class GlobalProductAjax extends AjaxBase
{

    public function __construct($core, $prefix)
    {
        parent::__construct($core, $prefix, 'global_product');
    }


    protected function RegisterHooks()
    {
        $this->RegisterPrivate('SaveGlobalOptions','SaveGlobalOptions','administrator|shop_manager');
        $this->RegisterPrivate('DeleteGlobalOptions','DeleteGlobalOptions','administrator|shop_manager');
        $this->RegisterPrivate('CloneGlobalOption','CloneGlobalOption','administrator|shop_manager');
        $this->RegisterPrivate('TogglingGlobalOption','TogglingGlobalOption','administrator|shop_manager');
    }

    public function TogglingGlobalOption()
    {
        $id=intval($this->GetRequired('Id'));
        $status=intval($this->GetRequired('Status'));

        $repository=new GlobalProductRepository($this->Loader);
        if($repository->ChangeStatus($id,$status)>0)
        {
            $this->SendSuccessMessage('True');
        }

        $this->SendErrorMessage('Sorry an error occurred, please try again');

    }

    public function CloneGlobalOption(){
        $id=$this->GetRequired('Id');
        $repository=new GlobalProductRepository($this->Loader);
        try{
            $id=$repository->Clone(intval($id));
            $this->SendSuccessMessage($id);
        }catch (\Exception $e)
        {
            $this->SendErrorMessage($e->getMessage());
        }

    }

    public function DeleteGlobalOptions()
    {
        $id=$this->GetRequired('Id');
        $repository=new GlobalProductRepository($this->Loader);
        try{
            $repository->DeleteGlobalProducts($id);
        }catch (\Exception $e)
        {
            $this->SendErrorMessage($e->getMessage());
        }

        $this->SendSuccessMessage(1);

    }

    public function SaveGlobalOptions(){
        $options=$this->GetRequired('Options');
        $serverOptions=$this->GetRequired('ServerOptions');
        $translations=$this->GetOptional('Translations');
        $condition=null;

        if(isset($options->Condition))
        {
            $condition = ObjectSanitizer::Sanitize($options->Condition, (object)["ConditionGroups" => []]);
            if (count($condition->ConditionGroups) == 0)
                $condition = null;
        }

        $exclude=null;
        if(isset($options->Exclued))
        {
            $exclude = ObjectSanitizer::Sanitize($options->Exclude, (object)["ConditionGroups" => []]);
            if (count($exclude->ConditionGroups) == 0)
                $exclude = null;
        }

        $repository=new GlobalProductRepository($this->Loader);
        try{
            $globalId=$repository->SaveGlobalProduct($options,$serverOptions);
            $productRepository=new ProductRepository($this->Loader);

            if($translations!=null)
            {
                $translations=json_decode($translations);
                if($translations!=null)
                {
                    $productRepository->SaveTranslations($globalId,ProductRepository::TRANSLATION_TYPE_GLOBAL,$translations);
                }
            }
            $this->SendSuccessMessage(["Id"=>$globalId]);
        }catch (\Exception $e)
        {
            $this->SendErrorMessage($e->getMessage());
        }

    }
}