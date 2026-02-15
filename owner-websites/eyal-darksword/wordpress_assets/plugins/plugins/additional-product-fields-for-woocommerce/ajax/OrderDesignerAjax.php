<?php


namespace rednaowooextraproduct\ajax;



use rednaowooextraproduct\core\Managers\FileManager\FileManager;
use rednaowooextraproduct\repository\ProductRepository;

class OrderDesignerAjax extends AjaxBase
{

    public function __construct($core, $prefix)
    {
        parent::__construct($core, $prefix, 'order_designer');
    }


    protected function RegisterHooks()
    {
        $this->RegisterPrivate('getfileupload','GetFileUpload');
        $this->RegisterPublic('getpublicfileupload','GetFileUpload',false);
        $this->RegisterPublic('dontshowagain','DontShowAgain',false);
    }

    public function DontShowAgain(){
        if(!wp_verify_nonce($_POST['nonce'],'pbdontshowagain'))
            return;
        \update_option('rednaowooextraproduct_dont_show_again',1);
    }

    public function GetFileUpload(){
        if(!isset($_GET['path']))
            $this->SendErrorMessage('Invalid operation');

        $path=sanitize_file_name(basename(\strval($_GET['path'])));
        $name=$_GET['name'];
        if($name=='signature')
            $name='signature.png';
        $manager=new FileManager($this->Loader);



        if(isset($_GET['temp']))
        {
            $baseDir=$manager->GetTempFolderRootPath();
        }else
            $baseDir=$manager->GetOrderFolderRootPath();
        $realPath=$baseDir.$path;

        if(!\file_exists($realPath))
        {
            $this->SendErrorMessage('File does not exists');
        }


        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Disposition: '.($name=='signature.png'?'inline':'attachment').'; filename="'.$name.'"');
        header('Content-Type: '.\mime_content_type($realPath));

        //Define file size
        header('Content-Length: ' . filesize($realPath));
        readfile($realPath);
        exit;



    }
}