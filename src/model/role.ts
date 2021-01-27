export enum Role {
    HOST = 'host',
    SUB_HOST = 'sub-host',
    MODERATOR = 'moderator',
    /**
     * @deprecated in favor of {@link SUB_HOST} & {@link MODERATOR} permissions.
     */
    PROMOTED = 'promoted',
    MEMBER = 'member'
}