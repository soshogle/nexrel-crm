/**
 * External dependencies
 */
import { __, sprintf, _n } from '@wordpress/i18n';
import { map, some, pickBy, isEmpty } from 'lodash';
import {
	SelectControl as Select,
	Flex,
	Button,
	Icon,
} from '@wordpress/components';
import { CollapsibleContent } from '@woocommerce/components';
import { MediaUpload } from '@wordpress/media-utils';

/**
 * Internal dependencies
 */
import {
	addTerm,
	removeTerm,
	updateTermValue,
	addImageToTerm,
	removeTermImage,
} from '../helpers';

export function Attribute( {
	attributeName,
	attributeImage,
	setAttributeImagesValue,
	productAttributes,
	atributeImagesData: data,
	searchQuery,
	attributeImages,
} ) {
	const availableTerms =
		'all' !== attributeName &&
		Object.values(
			pickBy(
				{
					...{ 0: 'Any' },
					...productAttributes[ attributeName ][ 'terms' ],
				},
				( value ) => {
					return ! some( data?.[ attributeName ].terms, [
						'term',
						value,
					] );
				}
			)
		);

	return (
		!! attributeImage.terms?.length && (
			<div className="wp-block-iconic-woothumbs-attribute-images__attribute-wrapper">
				<Flex className="wp-block-iconic-woothumbs-attribute-images__attribute">
					<span className="wp-block-iconic-woothumbs-attribute-images__attribute-label">
						{ sprintf(
							__( 'Attribute: %s', 'iconic-woothumbs' ),
							attributeImage.label
						) }
					</span>

					{ 'all' !== attributeName && !! availableTerms?.length && (
						<Button
							variant="secondary"
							size="compact"
							onClick={ () => {
								if ( availableTerms.length < 2 ) {
									setActionField( '' );
								}

								setAttributeImagesValue(
									addTerm(
										attributeName,
										'',
										availableTerms[ 0 ],
										attributeImages
									)
								);
							} }
						>
							{ sprintf(
								__( 'Add %s', 'iconic-woothumbs' ),
								attributeImage.label
							) }
						</Button>
					) }
				</Flex>

				{ attributeImage.terms
					?.filter( ( termData ) => {
						if ( isEmpty( searchQuery ) ) {
							return true;
						}

						return termData.term
							.toLowerCase()
							.includes( searchQuery.toLowerCase() );
					} )
					.map( ( termData ) => (
						<React.Fragment key={ attributeName }>
							<Flex>
								{ 'all' !== attributeName && (
									<Select
										style={ { width: '200px' } }
										value={ termData.term }
										onChange={ ( newTerm ) => {
											setAttributeImagesValue(
												updateTermValue(
													newTerm,
													termData.term,
													attributeName,
													attributeImages
												)
											);
										} }
									>
										<option
											value={ 'Any' }
											disabled={ some(
												attributeImage.terms,
												[ 'term', 'Any' ]
											) }
										>
											{ __( 'Any', 'iconic-woothumbs' ) }
										</option>

										{ map(
											productAttributes[ attributeName ]
												?.terms,
											( termName ) => (
												<option
													key={ termName }
													value={ termName }
													disabled={
														termName !==
															termData.term &&
														some(
															attributeImage.terms,
															[ 'term', termName ]
														)
													}
												>
													{ termName }
												</option>
											)
										) }
									</Select>
								) }

								<div className="wp-block-iconic-woothumbs-attribute-images__remove-term-button-wrapper">
									<Icon
										className="wp-block-iconic-woothumbs-attribute-images__remove-term-button"
										onClick={ () => {
											setAttributeImagesValue(
												removeTerm(
													termData.term,
													attributeName,
													attributeImages
												)
											);
										} }
										icon="trash"
										style={ {
											fontFamily: 'dashicons',
										} }
									/>
								</div>
							</Flex>

							<div
								className={ `wp-block-iconic-woothumbs-attribute-images__attribute-images ${
									'all' === attributeName
										? 'wp-block-iconic-woothumbs-attribute-images__attribute-images--all'
										: ''
								}` }
							>
								<CollapsibleContent
									toggleText={ sprintf(
										_n(
											'%s image',
											'%s images',
											termData.images?.length,
											'iconic-woothumbs'
										),
										termData.images?.length
									) }
								>
									<Flex justify="normal" wrap>
										{ termData.images?.map( ( image ) => (
											<div
												key={ image.id }
												className="wp-block-iconic-woothumbs-attribute-images__attribute-image"
												title={ __(
													'Remove image',
													'iconic-woothumbs'
												) }
											>
												{ image.url && (
													<div
														className="wp-block-iconic-woothumbs-attribute-images__term-image-wrap"
														onClick={ () => {
															setAttributeImagesValue(
																removeTermImage(
																	image.id,
																	termData.term,
																	attributeName,
																	attributeImages
																)
															);
														} }
													>
														<Icon
															className="wp-block-iconic-woothumbs-attribute-images__term-image-remove-button"
															icon="remove"
															style={ {
																fontFamily:
																	'dashicons',
															} }
															title={ __(
																'Remove image',
																'iconic-woothumbs'
															) }
														/>

														<img
															src={ image.url }
															className="wp-block-iconic-woothumbs-attribute-images__term-image"
														/>
													</div>
												) }
											</div>
										) ) }
									</Flex>

									<MediaUpload
										allowedTypes="image"
										multiple
										onSelect={ ( medias ) => {
											const images = medias.map(
												( media ) => ( {
													id: `${ media.id }`,
													url: media.url,
												} )
											);

											setAttributeImagesValue(
												addImageToTerm(
													images,
													termData.term,
													attributeName,
													attributeImages
												)
											);
										} }
										render={ ( { open } ) => (
											<Button
												onClick={ open }
												variant="secondary"
												size="compact"
											>
												{ __(
													'Add Images',
													'iconic-woothumbs'
												) }
											</Button>
										) }
									/>
								</CollapsibleContent>
							</div>
						</React.Fragment>
					) ) }
			</div>
		)
	);
}
