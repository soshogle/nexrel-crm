<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Fields;


use rednaowooextraproduct\core\Managers\FileManager\FileManager;

class FBGoogleMaps extends FBFieldBase
{
    public function GetValue()
    {
        return $this->GetEntryValue('Value','');
    }

    public function GetLineItems(){
        if($this->Entry==null||$this->GetEntryValue('Value','')==='')
            return array();

        $path='';
        $fileName='';
        if(count($this->Entry->Value->Markers)>=0&&$this->Options->ShowMap)
        {
            $value=$this->Entry->Value;
            $form=$form=$this->GetRootForm();
            $url='';
            if(isset($form->Options->MapsApiKey)&&$form->Options->MapsApiKey!='')
            {
                $url = "https://maps.googleapis.com/maps/api/staticmap?a=1";

                if(isset($value->Markers)&&count($value->Markers)>0)
                {
                    foreach($value->Markers as $currentMarker)
                    {
                        $url.='&markers='.$currentMarker->MarkerLatitude.','.$currentMarker->MarkerLongitude;
                    }

                }
                else
                    $url.=$value->Latitude.','.$value->Longitude;
                $url.='&size=300x300';

                $url.='&maptype=roadmap';
                $url.='&key='.$form->Options->MapsApiKey;


                $data=\file_get_contents($url);
                $fileManager=new FileManager($this->Loader);
                $path=$fileManager->GetMapsFolderRootPath();
                $fileName=$fileManager->GetSafeFileName($path,'Map.png');
                \file_put_contents($path.$fileName,$data);
                $this->Entry->Value->FileName=$fileName;
                $this->Entry->Value->Path=$path.$fileName;

            }
        }

        return array((object)\array_merge((array)$this->Entry,array(
            'Id'=>$this->Options->Id,
            'FieldName'=>$this->Options->FieldName,
            'Type'=>$this->Options->Type,
            'MapPath'=>$path,
            'FileName'=>$fileName
        )));
    }

}