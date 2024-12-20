import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Avatar, Tabs, Empty, Dropdown, Menu, message, Modal, Spin, Space } from 'antd';
import { UserOutlined, TeamOutlined, HeartOutlined, CommentOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import EditProfile from './EditProfile';
import FollowList from './FollowList';
import { jwtDecode } from 'jwt-decode';

const { TabPane } = Tabs;

const ProfileContainer = styled.div`
  max-width: 935px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 80px;
  margin-bottom: 44px;
`;

const ProfileActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const AvatarSection = styled.div`
  flex: 0 0 auto;
  margin-right: 30px;
  display: flex;
  justify-content: center;
  width: 150px;
`;

const InfoSection = styled.div`
  flex: 1;
`;

const Username = styled.h2`
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 20px;
`;

const Stats = styled.div`
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
`;

const StatItem = styled.div`
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const Bio = styled.div`
  font-size: 16px;
  margin-top: 20px;
`;

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-top: 20px;
`;

const PostItem = styled.div`
  position: relative;
  padding-bottom: 100%;
  cursor: pointer;
  background: #f5f5f5;
  
  &:hover .overlay {
    opacity: 1;
  }
`;

const PostImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
`;

const PostModalWrapper = styled.div`
  display: flex;
  height: 80vh;
  max-height: 750px;
  background: #fff;
`;

const PostImageSection = styled.div`
  flex: 2;
  background: ${props => props.textOnly ? '#f5f5f5' : '#000'};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PostDetailsSection = styled.div`
  flex: 1;
  width: 300px;
  border-left: 1px solid #dbdbdb;
  display: flex;
  flex-direction: column;
  background: #fff;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #dbdbdb;
`;

const PostContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-top: 16px;
`;

const TextPostOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 20px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 14px;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
`;

const PostTextContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  font-size: 18px;
  line-height: 1.6;
  color: #262626;
  background: #f5f5f5;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
`;

const EditProfileModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-body {
    padding: 24px;
  }
`;

const PostModal = styled(Modal)`
  .ant-modal-content {
    overflow: hidden;
  }
`;

const Profile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    // 1. 所有状态定义
    const [currentUserId, setCurrentUserId] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState('none');
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDataFetching, setIsDataFetching] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isPostModalVisible, setIsPostModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');

    // 2. 基础判断逻辑
    const isOwnProfile = useMemo(() => {
        return !userId || currentUserId === profileData?._id;
    }, [userId, currentUserId, profileData]);

    // 3. 可见性控制逻辑
    const canViewFollowers = useMemo(() => {
        if (isOwnProfile) return true;
        if (profileData?.privacy?.profileVisibility === 'public') {
            return profileData?.privacy?.showFollowers !== false;
        }
        if (friendshipStatus === 'friends') {
            return profileData?.privacy?.showFollowers !== false;
        }
        return false;
    }, [isOwnProfile, profileData, friendshipStatus]);

    const canViewFollowing = useMemo(() => {
        if (isOwnProfile) return true;
        if (profileData?.privacy?.profileVisibility === 'public') {
            return profileData?.privacy?.showFollowing !== false;
        }
        if (friendshipStatus === 'friends') {
            return profileData?.privacy?.showFollowing !== false;
        }
        return false;
    }, [isOwnProfile, profileData, friendshipStatus]);

    // 4. 数据获取函数
    const fetchFollowData = useCallback(async () => {
        if (!userId) return;
        
        try {
            const [followersRes, followingRes] = await Promise.all([
                axios.get(`/follow/${userId}/followers`),
                axios.get(`/follow/${userId}/following`)
            ]);

            setFollowers(followersRes.data);
            setFollowing(followingRes.data);
        } catch (error) {
            if (!error.response || error.response.status !== 404) {
                console.error('获取关注数失败:', error);
                message.error('获取关注数据失败');
            }
        }
    }, [userId]);

    const fetchProfileData = async () => {
        if (isDataFetching) return;
        
        try {
            setIsDataFetching(true);
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            if (!token || !sessionId) {
                navigate('/login');
                return;
            }

            // 并行获取所有需要的数据
            const requests = [
                // 获取用户资料
                axios.get(
                    `http://localhost:5000/api/users/${userId || 'me'}`,
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                )
            ];

            // 如果是查看他人主页，添加关注状态和好友状态的请求
            if (userId && userId !== currentUserId) {
                requests.push(
                    axios.get(
                        `http://localhost:5000/api/follow/status/${userId}`,
                        {
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Session-ID': sessionId,
                                'Cache-Control': 'no-cache'
                            }
                        }
                    ).catch(err => {
                        console.log('获取关注状态失败:', err);
                        return { data: { isFollowing: false } };
                    }),
                    axios.get(
                        `http://localhost:5000/api/friends/status/${userId}`,
                        {
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Session-ID': sessionId
                            }
                        }
                    ).catch(err => {
                        console.log('获取好友状态失败:', err);
                        return { data: { status: 'none' } };
                    })
                );
            }

            const responses = await Promise.all(requests);
            const userData = responses[0].data;
            setProfileData(userData);

            // 如果是查看他人主页，设置关注和好友状态
            if (userId && userId !== currentUserId && responses.length > 1) {
                setIsFollowing(responses[1].data.isFollowing);
                setFriendshipStatus(responses[2].data.status);
            }

            // 获取帖子
            if (!userData.isPrivate || userId === currentUserId) {
                try {
                    const postsResponse = await axios.get(
                        `http://localhost:5000/api/posts/user/${userId || userData._id}`,
                        { 
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Session-ID': sessionId
                            }
                        }
                    );
                    setPosts(postsResponse.data);
                } catch (error) {
                    console.error('获取帖子失败:', error);
                    setPosts([]);
                }
            } else {
                setPosts([]);
            }

            // 获取关注和粉丝数据
            if (!userData.isPrivate || userId === currentUserId) {
                try {
                    const [followersRes, followingRes] = await Promise.all([
                        axios.get(
                            `http://localhost:5000/api/follow/${userId || userData._id}/followers`,
                            { headers: { Authorization: `Bearer ${token}` }}
                        ),
                        axios.get(
                            `http://localhost:5000/api/follow/${userId || userData._id}/following`,
                            { headers: { Authorization: `Bearer ${token}` }}
                        )
                    ]);

                    setFollowers(followersRes.data);
                    setFollowing(followingRes.data);
                } catch (error) {
                    console.error('获取关注数据失败:', error);
                    setFollowers([]);
                    setFollowing([]);
                }
            }

        } catch (error) {
            console.error('获取个人资料失败:', error);
            message.error('获取个人资料失败');
        } finally {
            setLoading(false);
            setIsDataFetching(false);
        }
    };

    // 5. 事件处理函数
    const handleFriendAction = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            if (!token || !sessionId) {
                message.error('请先登录');
                navigate('/login');
                return;
            }

            if (friendshipStatus === 'none') {
                await axios.post(
                    `http://localhost:5000/api/friends/request/${userId}`,
                    {},
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                setFriendshipStatus('pending');
                message.success('已发送好友请求');
            } else if (friendshipStatus === 'friends') {
                await axios.delete(
                    `http://localhost:5000/api/friends/${userId}`,
                    { 
                        headers: { 
                            Authorization: `Bearer ${token}`,
                            'Session-ID': sessionId
                        }
                    }
                );
                setFriendshipStatus('none');
                message.success('已删除好友');
            }
            fetchProfileData();
        } catch (error) {
            console.error('好友操作失败:', error);
            message.error('操作失败');
        }
    };

    const handlePostClick = (post) => {
        setSelectedPost(post);
        setIsPostModalVisible(true);
    };

    // 6. useEffect 钩子
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        if (token && sessionId) {
            const decodedToken = jwtDecode(token);
            setCurrentUserId(decodedToken.userId);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (currentUserId) {  // 只要有当前用户ID就可以加载数据
            fetchProfileData();
        }
    }, [userId, currentUserId]);

    // 添加一个判断是否为私密账户的函数
    const isPrivateProfile = useMemo(() => {
        return profileData?.privacy?.profileVisibility === 'private' && !isOwnProfile;
    }, [profileData, isOwnProfile]);

    // 7. 渲染逻辑
    if (loading) {
        return (
            <ProfileContainer>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" tip="加载中..." />
                </div>
            </ProfileContainer>
        );
    }

    if (!profileData) {
        return (
            <ProfileContainer>
                <Empty
                    description="未找到用户信息"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </ProfileContainer>
        );
    }

    // 修改渲染部分的按钮
    const renderActionButtons = () => {
        if (isOwnProfile) {
            return (
                <Button onClick={() => setIsEditModalVisible(true)}>
                    编辑个人资料
                </Button>
            );
        }

        if (userId === currentUserId) {
            return null;
        }

        // 如果是私密账户，只显示关注按钮
        if (isPrivateProfile) {
            return (
                <Button 
                    type={isFollowing ? 'default' : 'primary'}
                    onClick={handleFollowClick}
                >
                    {isFollowing ? '已关注' : '关注'}
                </Button>
            );
        }

        return (
            <Space>
                {friendshipStatus === 'friends' ? (
                    <Button onClick={handleFriendAction}>
                        删除好友
                    </Button>
                ) : friendshipStatus === 'pending' ? (
                    <Button disabled>
                        请求已发送
                    </Button>
                ) : friendshipStatus === 'received' ? (
                    <Button type="primary" onClick={handleFriendAction}>
                        接受请求
                    </Button>
                ) : (
                    <Button type="primary" onClick={handleFriendAction}>
                        添加好友
                    </Button>
                )}
                <Button 
                    type={isFollowing ? 'default' : 'primary'}
                    onClick={handleFollowClick}
                >
                    {isFollowing ? '已关注' : '关注'}
                </Button>
            </Space>
        );
    };

    // 修改关注处理函数
    const handleFollowClick = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const sessionId = sessionStorage.getItem('sessionId');
            if (!token || !sessionId) {
                message.error('请先登录');
                navigate('/login');
                return;
            }

            // 先更新本地状态
            const newIsFollowing = !isFollowing;
            setIsFollowing(newIsFollowing);

            const response = await axios.post(
                `http://localhost:5000/api/follow/${userId}`,
                {},
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Session-ID': sessionId
                    }
                }
            );

            // 如果后端返回的状态与我们预期的不一致，回滚本地状态
            if (response.data.isFollowing !== newIsFollowing) {
                setIsFollowing(response.data.isFollowing);
            }

            // 更新关注者数量等数据
            if (profileData) {
                setProfileData(prev => ({
                    ...prev,
                    followers: response.data.isFollowing 
                        ? [...(prev.followers || []), currentUserId]
                        : (prev.followers || []).filter(id => id !== currentUserId)
                }));
            }

            message.success(response.data.isFollowing ? '关注成功' : '已取消关注');
        } catch (error) {
            // 发生错误时回滚状态
            setIsFollowing(!isFollowing);
            console.error('关注操作失败:', error);
            message.error('操作失败，请重试');
        }
    };

    return (
        <ProfileContainer>
            <ProfileHeader>
                <AvatarSection>
                    <Avatar 
                        size={150} 
                        icon={<UserOutlined />} 
                        src={profileData?.avatar ? `http://localhost:5000${profileData.avatar}` : null} 
                    />
                </AvatarSection>
                <InfoSection>
                    <Username>
                        {profileData?.username}
                        {isPrivateProfile && 
                            <span style={{ fontSize: '14px', color: '#8e8e8e', marginLeft: '8px' }}>
                                (私密账户)
                            </span>
                        }
                    </Username>
                    
                    {renderActionButtons()}

                    <Stats>
                        {/* 私密账户显示占位符 */}
                        {isPrivateProfile ? (
                            <>
                                <StatItem>
                                    <strong>**</strong> 帖子
                                </StatItem>
                                <StatItem>
                                    <strong>**</strong> 粉丝
                                </StatItem>
                                <StatItem>
                                    <strong>**</strong> 关注
                                </StatItem>
                            </>
                        ) : (
                            <>
                                <StatItem onClick={() => setActiveTab('posts')}>
                                    <strong>{posts?.length || 0}</strong> 帖子
                                </StatItem>
                                {canViewFollowers && (
                                    <StatItem onClick={() => setActiveTab('followers')}>
                                        <strong>{followers?.length || 0}</strong> 粉丝
                                    </StatItem>
                                )}
                                {canViewFollowing && (
                                    <StatItem onClick={() => setActiveTab('following')}>
                                        <strong>{following?.length || 0}</strong> 关注
                                    </StatItem>
                                )}
                            </>
                        )}
                    </Stats>

                    {/* 私密账户显示提示信息 */}
                    {isPrivateProfile ? (
                        <Bio>这是一个私密账户</Bio>
                    ) : (
                        <Bio>{profileData?.bio || '暂无简介'}</Bio>
                    )}
                </InfoSection>
            </ProfileHeader>

            {/* 私密账户不显示Tabs内容 */}
            {!isPrivateProfile && (
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab={`帖子 ${posts?.length || 0}`} key="posts">
                        <PostGrid>
                            {posts.map(post => (
                                <PostItem key={post._id} onClick={() => handlePostClick(post)}>
                                    {(post.images?.[0] || post.image) ? (
                                        <>
                                            <PostImage
                                                src={`http://localhost:5000${post.images?.[0] || post.image}`}
                                                alt="Post preview"
                                            />
                                            <Overlay className="overlay">
                                                <Space size={30}>
                                                    <div>
                                                        <HeartOutlined /> {post.likes?.length || 0}
                                                    </div>
                                                    <div>
                                                        <CommentOutlined /> {post.comments?.length || 0}
                                                    </div>
                                                </Space>
                                            </Overlay>
                                        </>
                                    ) : (
                                        <div className="text-only">
                                            {post.content}
                                        </div>
                                    )}
                                </PostItem>
                            ))}
                        </PostGrid>
                    </TabPane>
                    {canViewFollowers && (
                        <TabPane tab={`粉丝 ${followers?.length || 0}`} key="followers">
                            <FollowList 
                                users={followers}
                                type="followers"
                                onUpdate={fetchProfileData}
                                currentUserId={currentUserId}
                                isOwnProfile={isOwnProfile}
                            />
                        </TabPane>
                    )}
                    {canViewFollowing && (
                        <TabPane tab={`关注 ${following?.length || 0}`} key="following">
                            <FollowList 
                                users={following}
                                type="following"
                                onUpdate={fetchProfileData}
                                currentUserId={currentUserId}
                            />
                        </TabPane>
                    )}
                </Tabs>
            )}

            {/* 添加编辑个人资料模态框 */}
            {isEditModalVisible && (
                <EditProfileModal 
                    title="编辑个人资料"
                    visible={isEditModalVisible}
                    onCancel={() => setIsEditModalVisible(false)}
                    footer={null}
                    width={600}
                    destroyOnClose
                >
                    <EditProfile 
                        onClose={() => setIsEditModalVisible(false)}
                        onSuccess={() => {
                            setIsEditModalVisible(false);
                            fetchProfileData();
                        }}
                        initialData={profileData}
                    />
                </EditProfileModal>
            )}

            {/* 帖子详情模态框 */}
            <PostModal
                visible={isPostModalVisible}
                onCancel={() => setIsPostModalVisible(false)}
                width="65%"
                style={{ 
                    maxWidth: '1100px',
                    margin: '20px auto',
                    padding: 0
                }}
                footer={null}
                destroyOnClose
                bodyStyle={{ padding: 0 }}
                centered
            >
                {selectedPost && (
                    <PostModalWrapper>
                        <PostImageSection textOnly={!selectedPost.images?.[0] && !selectedPost.image}>
                            {(selectedPost.images?.[0] || selectedPost.image) ? (
                                <img 
                                    src={`http://localhost:5000${selectedPost.images?.[0] || selectedPost.image}`}
                                    alt={selectedPost.content}
                                />
                            ) : (
                                <PostTextContent>
                                    {selectedPost.content}
                                </PostTextContent>
                            )}
                        </PostImageSection>
                        <PostDetailsSection>
                            <PostHeader>
                                <Avatar 
                                    size={32} 
                                    src={profileData?.avatar ? `http://localhost:5000${profileData.avatar}` : null}
                                    icon={<UserOutlined />}
                                />
                                <span style={{ marginLeft: '10px' }}>{profileData?.username}</span>
                            </PostHeader>
                            <PostContent>
                                {selectedPost.content && (
                                    <div style={{ padding: '16px 0' }}>
                                        {selectedPost.content}
                                    </div>
                                )}
                                {/* 这里以添加评论等其他内容 */}
                            </PostContent>
                        </PostDetailsSection>
                    </PostModalWrapper>
                )}
            </PostModal>
        </ProfileContainer>
    );
};

export default Profile; 