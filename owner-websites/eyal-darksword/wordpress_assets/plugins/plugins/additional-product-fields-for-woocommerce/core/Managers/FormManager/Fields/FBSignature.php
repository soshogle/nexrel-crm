<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Fields;


use rednaowooextraproduct\core\Managers\FileManager\FileManager;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\HtmlTagWrapper;


class FBSignature extends FBFieldBase
{
    public function GetValue()
    {
        return $this->GetEntryValue('Value','');
    }

    public function GetText()
    {
        return $this->GetEntryValue('Value','');
    }

    public function GetLineItems(){
        if($this->Entry==null||$this->GetEntryValue('Value','')==='')
            return array();

        $value=$this->GetEntryValue('Value','');
        if(!$this->IsValidBase64Image($value)){
            throw new \Exception('Invalid signature image');
        }

        $fileManager=new FileManager($this->Loader);
        $this->Entry->Path=$fileManager->TemporaryUploadSignature($this->GetEntryValue('Value',''));

        return array((object)\array_merge((array)$this->Entry,array(
            'Id'=>$this->Options->Id,
            'FieldName'=>$this->Options->FieldName,
            'Type'=>$this->Options->Type
        )));
    }

    private function IsValidBase64Image($data) {
        // Check if the data matches the data:image/png;base64 format
        if (preg_match('/^data:image\/png;base64,/', $data)) {
            // Remove the data:image/png;base64, part
            $data = substr($data, strpos($data, ',') + 1);

            // Decode the base64 string
            $decodedData = base64_decode($data, true);

            // Check if the decoded data is valid
            if ($decodedData !== false) {
                // Create an image resource from the decoded data
                $image = imagecreatefromstring($decodedData);

                // Check if the image resource is valid
                if ($image !== false) {
                    // Free up memory
                    imagedestroy($image);
                    return true;
                }
            }
        }
        return false;
    }

    public function GetHtml($document)
    {
        $container=new HtmlTagWrapper($document,$document->createElement('img'));
        $path=$this->GetEntryValue('Path','');

        $prefix=$this->Loader->Prefix;
        $url=admin_url( 'admin-ajax.php').'?action='.$prefix.'_getpublicfileupload&path='.\basename($path).'&name='.'signature';

        $container->SetAttribute('src',$path);
        return $container;
    }

    public function CommitCreation()
    {
        $fileManager=new FileManager($this->Loader);
        $this->Entry->Path=$fileManager->GetOrderFolderRootPath().\basename($this->Entry->Path);
    }


}