<?php


namespace rednaowooextraproduct\core\Managers\FileManager;



use Exception;
use Imagick;
use ImagickPixel;
use rednaowooextraproduct\core\Loader;

class FileManager
{
    /** @var Loader */
    public $Loader;

    private $_rootPath='';

    public function __construct($loader)
    {
        $this->Loader = $loader;

    }


    public function GetMapsFolderRootPath()
    {
        $tempFolder=$this->GetRootFolderPath().'maps/';
        $this->MaybeCreateFolder($tempFolder,false);
        return $tempFolder;
    }

    public function GetSafeFileName($path,$name)
    {
        $ext = pathinfo($name, \PATHINFO_EXTENSION);
        $name = pathinfo($name, \PATHINFO_FILENAME);
        $newName=$name.'.'.$ext;
        if(\file_exists($path.$newName))
        {
            $count=1;

            do
            {
                $newName=$name.'_'.$count.'.'.$ext;
                $count++;
            }while((\file_exists($path.$newName)));
        }

        return $newName;

    }

    public function GetRootFolderPath()
    {
        if($this->_rootPath=='')
        {
            $uploadDir=wp_upload_dir();
            $this->_rootPath=\str_replace('\\','/', $uploadDir['basedir'].'/'.$this->Loader->Prefix.'/');
            $this->MaybeCreateFolder($this->_rootPath,true);
        }
        return $this->_rootPath;
    }


    public function GetFontURL(){
        $dir=wp_upload_dir();
        return $dir['baseurl'].'/'.$this->Loader->Prefix.'/';
    }


    public function GetTempFolderRootPath()
    {
        $tempFolder=$this->GetRootFolderPath().'temp/';
        $this->MaybeCreateFolder($tempFolder,true);
        return $tempFolder;
    }

    public function GetOrderFolderRootPath()
    {
        $tempFolder=$this->GetRootFolderPath().'OrderFiles/';
        $this->MaybeCreateFolder($tempFolder,true);
        return $tempFolder;
    }

    public function MaybeCreateFolder($directory,$secure=false)
    {
        if(!is_dir($directory))
            if(!mkdir($directory,0777,true))
                throw new Exception('Could not create folder '.$this->_rootPath);
            else{
                if($secure)
                {
                    @file_put_contents( $directory . '.htaccess', 'deny from all' );
                    @touch( $directory . 'index.php' );
                }else{
                    @file_put_contents( $directory . '.htaccess', 'allow from all' );
                    @touch( $directory . 'index.php' );
                }
            }


    }


    public function TemporaryUploadFile($name)
    {
        $tempDir=$this->GetTempFolderRootPath();
        $value=null;
        if(isset($_FILES[$name]))
            $value=$_FILES[$name];

        if($value==null)
            throw new Exception('File could not be uploaded');

        $wp_filetype=wp_check_filetype_and_ext( $value['tmp_name'], $value['name'], false );
        $ext = empty( $wp_filetype['ext'] ) ? '' : $wp_filetype['ext'];
        $type = empty( $wp_filetype['type'] ) ? '' : $wp_filetype['type'];

        if ( ( ! $type || !$ext ) && ! current_user_can( 'unfiltered_upload' ) ) {
            throw new Exception('Invalid File Type');
        }


        $ext=pathinfo($value["name"], PATHINFO_EXTENSION);
        $originalFileName=$value['name'];

        $fileName=uniqid("",true).".".pathinfo($value["name"], PATHINFO_EXTENSION);
        $fileName=wp_unique_filename($tempDir,$fileName);
        $id=md5(uniqid($fileName,true));

        if(@move_uploaded_file( $value['tmp_name'], $tempDir.$fileName )===false)
        {
            throw new Exception('Could not upload file');
        }

        return $tempDir.$fileName;
    }

    public function MaybeMoveToPermanentPath($Path)
    {

        $folder=$this->GetOrderFolderRootPath();

        if(\strpos($Path,$this->GetTempFolderRootPath()) !==0)
            return;

        $fileName=uniqid("",true).'.'.pathinfo($Path, PATHINFO_EXTENSION);;
        $fileName=wp_unique_filename($folder,$fileName);

        if(@copy( $Path, $folder.$fileName )===false)
        {
            throw new Exception('Could not upload file');
        }

        return $folder.$fileName;
    }


    public function TemporaryUploadSignature($signature)
    {

        $tempDir=$this->GetTempFolderRootPath();
        $fileName=uniqid("",true).'.png';
        $fileName=wp_unique_filename($tempDir,$fileName);



        $data = base64_decode( preg_replace( '#^data:image/\w+;base64,#i', '', $signature ) );
        $save_signature = file_put_contents( $tempDir.$fileName, $data );

        return $tempDir.$fileName;
    }

}